/**
 * @file CreatePhotoAlbumPage.jsx
 * @route /create-photo-album
 *
 * @description
 * 사진첩 스냅 작성 페이지.
 * 사용자가 최대 4장의 사진을 업로드하고, 레이아웃을 선택하며,
 * 제목/내용/태그/공개범위/날짜를 입력하여 앨범 게시물을 생성한다.
 * 게시(Post Snap) 시 2단계 API 호출로 처리된다:
 *   1단계: 사진 파일 업로드 → photoIds 획득
 *   2단계: 앨범 메타데이터 + photoIds 로 앨범 생성
 *
 * @layout
 * ┌─────────────────────────────────────────┐
 * │  [Header] (sticky)                      │
 * │    ← 뒤로가기    사진첩 창작            │
 * ├─────────────────────────────────────────┤
 * │  [작성 날짜 선택]                       │
 * │    Calendar 아이콘 + date 입력          │
 * ├─────────────────────────────────────────┤
 * │  [사진 등록] (최대 4장)                 │
 * │    + 버튼(파일 선택) + 썸네일 목록      │
 * │    [Step 2: 레이아웃 선택]              │
 * │      Solo / Twin H / Twin V / Quad      │
 * ├─────────────────────────────────────────┤
 * │  [제목 입력]                            │
 * │  [내용 입력] (textarea)                 │
 * ├─────────────────────────────────────────┤
 * │  [태그 입력] + 추가 버튼 + 태그 칩 목록│
 * ├─────────────────────────────────────────┤
 * │  [공개범위 설정]                        │
 * │    나만보기 / 글벗만 / 전체공개          │
 * ├─────────────────────────────────────────┤
 * │  [Post Snap 버튼]                       │
 * └─────────────────────────────────────────┘
 *
 * @constants
 *   layouts[]
 *     { id: 1, name: '1장',      grid: 'grid-cols-1',            apiValue: 'single' }
 *     { id: 2, name: '2장 가로', grid: 'grid-cols-2',            apiValue: 'horizontal-two' }
 *     { id: 3, name: '2장 세로', grid: 'grid-rows-2',            apiValue: 'vertical-two' }
 *     { id: 4, name: '4장',      grid: 'grid-cols-2 grid-rows-2', apiValue: 'grid' }
 *
 *   VISIBILITY_MAP
 *     private  → 'PRIVATE'
 *     friends  → 'FRIENDS_ONLY'
 *     public   → 'PUBLIC'
 *
 * @state
 *   photos         - 선택된 사진 배열. 각 항목: { url: string (ObjectURL), file: File }
 *                    최대 4장 제한. 추가 시 4장 초과분 자동 잘림.
 *   selectedLayout - 현재 선택된 레이아웃 ID (1~4). 사진 수에 따라 자동 설정.
 *   title          - 제목 입력 값
 *   content        - 내용 입력 값 (최대 2000자 안내)
 *   tags           - 태그 배열. 중복 추가 불가. [ 'tag1', 'tag2', ... ]
 *   tagInput       - 태그 입력창 임시 값
 *   visibility     - 공개범위. 'private' | 'friends' | 'public'
 *   selectedDate   - 작성 날짜 (YYYY-MM-DD). 초기값: 오늘
 *   isSubmitting   - handleComplete 실행 중 여부. true 이면 버튼 비활성 + 스피너
 *
 * @api (2단계 업로드)
 *   [단계 1] photoService.uploadPhotos({ files, userId })
 *            POST /api/photos/upload (multipart/form-data)
 *            응답: { photos: [ { photoId: number } ] }
 *
 *   [단계 2] albumService.createAlbum({ userId, title, bodyText, recordDate,
 *                                        visibility, layoutType, photoIds,
 *                                        slotIndexes, tags })
 *            POST /api/albums
 *            응답: { albumId: number, message: string }
 *            성공 후: /snap/{albumId} 로 navigate
 *
 * @userId
 *   localStorage['user'] 에서 JSON.parse 후 .id 추출.
 *   없으면 로그인 페이지(/login)로 이동.
 */
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, X, Calendar, Loader2, ImagePlus } from 'lucide-react';
import { photoService } from '@/api/photoService';
import { albumService } from '@/api/albumService';
import { useAlert } from '@/context/AlertContext';

/**
 * @constant layouts
 * 사진 레이아웃 옵션 목록.
 * getAvailableLayouts() 에서 현재 사진 수에 맞는 레이아웃만 필터링하여 표시.
 * apiValue 는 POST /api/albums 의 layoutType 필드 값으로 사용됨.
 *
 *   id=1: 사진 1장  → Solo      → apiValue: 'single'
 *   id=2: 사진 2장  → Twin H    → apiValue: 'horizontal-two' (가로 나열)
 *   id=3: 사진 2장  → Twin V    → apiValue: 'vertical-two'   (세로 나열)
 *   id=4: 사진 4장  → Quad      → apiValue: 'grid'           (2×2 격자)
 */
const layouts = [
  { id: 1, name: '1장', grid: 'grid-cols-1', apiValue: 'single' },
  { id: 2, name: '2장 가로', grid: 'grid-cols-2', apiValue: 'horizontal-two' },
  { id: 3, name: '2장 세로', grid: 'grid-rows-2', apiValue: 'vertical-two' },
  { id: 4, name: '4장', grid: 'grid-cols-2 grid-rows-2', apiValue: 'grid' },
];

/**
 * @constant VISIBILITY_MAP
 * UI 에서 사용하는 공개범위 문자열 → API 값 매핑.
 *   'private' → 'PRIVATE'      (나만 보기)
 *   'friends' → 'FRIENDS_ONLY' (글벗만 보기)
 *   'public'  → 'PUBLIC'       (전체 공개)
 */
const VISIBILITY_MAP = {
  private: 'PRIVATE',
  friends: 'FRIENDS',
  public: 'PUBLIC',
};

export default function CreatePhotoAlbumPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showConfirm, showAlert } = useAlert();

  /**
   * @state photos
   * 사용자가 선택한 사진 목록. 최대 4장.
   * 각 항목: { url: string (URL.createObjectURL), file: File }
   * url 은 이미지 미리보기에 사용됨 (src 속성).
   * file 은 API 업로드 시 FormData 에 포함됨.
   */
  const [photos, setPhotos] = useState([]); // { url: string, file: File } 형식으로 저장

  /**
   * @state selectedLayout
   * 현재 선택된 레이아웃 ID (1~4).
   * 사진 추가/삭제 시 자동으로 적절한 레이아웃으로 전환됨:
   *   사진 1장 → id=1 (Single)
   *   사진 2장 → id=2 (Twin H)
   *   사진 4장 → id=4 (Quad)
   * 사용자가 직접 레이아웃 버튼을 눌러 변경할 수도 있음.
   */
  const [selectedLayout, setSelectedLayout] = useState(1);

  /**
   * @state title
   * 게시물 제목 입력값.
   * handleComplete 에서 빈 문자열이면 오류 알림 표시 후 중단.
   */
  const [title, setTitle] = useState('');

  /**
   * @state content
   * 게시물 내용 입력값 (본문).
   * handleComplete 에서 빈 문자열이면 오류 알림 표시 후 중단.
   * API 의 bodyText 필드로 전달됨.
   * Post Snap 버튼은 content.trim() 이 비어있으면 disabled 됨.
   */
  const [content, setContent] = useState('');

  /**
   * @state tags
   * 입력된 태그 목록. 배열로 관리.
   * 중복 태그는 handleAddTag 에서 추가되지 않음.
   * API 의 tags 필드로 그대로 전달됨.
   * 각 태그 칩의 X 버튼으로 handleRemoveTag 호출하여 제거 가능.
   */
  const [tags, setTags] = useState([]);

  /**
   * @state tagInput
   * 태그 입력창의 현재 임시 값.
   * 엔터 키 또는 "추가" 버튼 클릭 시 handleAddTag 호출 후 '' 로 초기화.
   */
  const [tagInput, setTagInput] = useState('');

  /**
   * @state visibility
   * 게시물 공개범위. 초기값: 'private' (나만 보기).
   * VISIBILITY_MAP 을 통해 API 값으로 변환되어 전달됨.
   * 공개범위 버튼 클릭 시 setVisibility 로 변경.
   */
  const [visibility, setVisibility] = useState('private');

  /**
   * @state selectedDate
   * 게시물 작성 날짜 (YYYY-MM-DD). 초기값: 오늘.
   * date input 과 연결됨.
   * API 의 recordDate 필드로 전달됨.
   */
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  /**
   * @state isSubmitting
   * handleComplete 의 2단계 API 호출 진행 중 여부.
   * true 이면:
   *   - Post Snap 버튼 disabled
   *   - 버튼 텍스트가 "Checking..." + Loader2 스피너로 전환
   * finally 에서 항상 false 로 전환됨.
   */
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * @function handlePhotoUpload
   * @param {Event} e - file input 의 change 이벤트
   *
   * 사진 선택 시 호출됨. 선택한 파일을 photos 상태에 추가한다.
   * 동작:
   *   1. e.target.files 에서 File 배열 추출
   *   2. 각 File 을 { url: URL.createObjectURL(file), file } 객체로 변환
   *   3. 기존 photos + 새 항목을 합쳐 최대 4장으로 제한 (.slice(0, 4))
   *   4. 사진 수에 따라 selectedLayout 자동 조정:
   *      1장 → 레이아웃 1, 2장 → 레이아웃 2, 4장+ → 레이아웃 4
   *
   * 트리거: file input 의 onChange (accept="image/*", multiple)
   */
  const handlePhotoUpload = (e) => {
    // TODO: e.target.files에서 File 배열 추출
    const files = e.target.files;
    // TODO: 각 File을 { url: URL.createObjectURL(file), file } 객체로 변환
    if (files) {
      const newPhotoObjects = Array.from(files).map((file) => ({
        url: URL.createObjectURL(file), // 브라우저 로컬 미리보기 URL
        file: file
      }));

      // TODO: 기존 photos + 새 항목 합쳐 최대 4장(.slice(0,4))으로 제한 후 setPhotos()
      // 힌트: 사진 수에 따라 setSelectedLayout(1/2/4) 자동 조정
      const updatedPhotos = [...photos, ...newPhotoObjects].slice(0, 4);
      setPhotos(updatedPhotos);

      if (updatedPhotos.length === 1) setSelectedLayout(1);
      else if (updatedPhotos.length === 2) setSelectedLayout(2);
      else if (updatedPhotos.length >= 4) setSelectedLayout(4);
    }
  };


  /**
   * @function removePhoto
   * @param {number} index - 제거할 사진의 배열 인덱스
   *
   * 해당 인덱스의 사진을 photos 에서 제거한다.
   * 제거 후 남은 사진 수에 따라 selectedLayout 도 재조정됨.
   *
   * 트리거: 각 썸네일의 X 버튼 클릭
   */
  const removePhoto = (index) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    // 남은 사진 수에 맞게 레이아웃 재조정
    if (newPhotos.length === 1) setSelectedLayout(1);
    else if (newPhotos.length === 2) setSelectedLayout(2);
    else if (newPhotos.length >= 4) setSelectedLayout(4);
  };

  /**
   * @function getAvailableLayouts
   * 현재 사진 수에 따라 선택 가능한 레이아웃 목록을 반환한다.
   * 레이아웃 선택 UI 에서 이 함수의 반환값만 버튼으로 렌더링된다.
   *
   * 반환 규칙:
   *   photos.length === 0 → [] (레이아웃 UI 자체 미표시)
   *   photos.length === 1 → [id=1] (Solo만)
   *   photos.length === 2 → [id=2, id=3] (Twin H, Twin V)
   *   photos.length === 3 → [id=2, id=3] (2장 레이아웃만, 3장 전용 없음)
   *   photos.length === 4 → [id=4] (Quad만)
   */
  const getAvailableLayouts = () => {
    if (photos.length === 0) return [];
    if (photos.length === 1) return layouts.filter((l) => l.id === 1);
    if (photos.length === 2) return layouts.filter((l) => l.id === 2 || l.id === 3);
    if (photos.length === 3) return layouts.filter((l) => l.id === 2 || l.id === 3);
    return layouts.filter((l) => l.id === 4);
  };

  /**
   * @function handleAddTag
   * tagInput 의 현재 값을 tags 배열에 추가한다.
   * 동작:
   *   1. tagInput.trim() 이 비어있으면 무시
   *   2. 이미 tags 에 동일 값이 있으면 무시 (중복 방지)
   *   3. tags 배열에 tagInput.trim() 추가
   *   4. tagInput 을 '' 로 초기화
   *
   * 트리거: 태그 입력창의 Enter 키(onKeyDown) 또는 "추가" 버튼 클릭
   */
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  /**
   * @function handleRemoveTag
   * @param {string} tag - 제거할 태그 문자열
   *
   * tags 배열에서 해당 태그를 제거한다.
   * 트리거: 태그 칩의 X 버튼 클릭
   */
  const handleRemoveTag = (tag) => {
    setTags(tags.filter((t) => t !== tag));
  };

  /**
   * @function getCurrentUserId
   * localStorage 에서 현재 로그인한 유저의 ID 를 추출하여 반환한다.
   *
   * 동작:
   *   1. localStorage.getItem('user') 로 JSON 문자열 읽기
   *   2. JSON.parse 후 .id 추출
   *   3. 없거나 파싱 실패 시 null 반환
   *
   * handleComplete 에서 null 이면 로그인 페이지로 이동시킴.
   */
  const getCurrentUserId = () => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return null;
      return JSON.parse(raw)?.id ?? null;
    } catch {
      return null;
    }
  };

  /**
   * @function getLayoutType
   * @param {number} layoutId - layouts 배열의 id (1~4)
   * @returns {string} API 에 전달할 layoutType 문자열
   *
   * selectedLayout ID 를 layouts 배열에서 찾아 apiValue 를 반환한다.
   * 예: 1 → 'single', 2 → 'horizontal-two', 4 → 'grid'
   * 찾지 못하면 'single' 을 기본값으로 반환.
   */
  const getLayoutType = (layoutId) => {
    return layouts.find((l) => l.id === layoutId)?.apiValue ?? 'single';
  };

  /**
   * @function handleComplete
   * Post Snap 버튼 클릭 시 실행되는 게시물 업로드 함수.
   * 유효성 검사 → 2단계 API 호출 → 성공 시 게시물 상세 페이지로 이동.
   *
   * [유효성 검사]
   *   - title.trim() 비어있음 → "제목을 입력해주세요." 알림 후 return
   *   - content.trim() 비어있음 → "내용을 입력해주세요." 알림 후 return
   *   - photos.length === 0 → "사진을 1장 이상 업로드해주세요." 알림 후 return
   *   - userId === null → "로그인 정보가 없습니다." 알림 후 /login 이동
   *
   * [단계 1] 사진 업로드
   *   photoService.uploadPhotos({ files: photos.map(p => p.file), userId })
   *   → POST /api/photos/upload (multipart/form-data)
   *   응답: { photos: [ { photoId } ] }
   *   photoIds = uploadedPhotos.map(p => p.photoId)
   *   slotIndexes = photoIds.map((_, i) => i)  (0, 1, 2, 3)
   *
   * [단계 2] 앨범 생성
   *   albumService.createAlbum({
   *     userId,
   *     title: title.trim(),
   *     bodyText: content.trim(),
   *     recordDate: selectedDate,
   *     visibility: VISIBILITY_MAP[visibility],
   *     layoutType: getLayoutType(selectedLayout),
   *     photoIds,
   *     slotIndexes,
   *     tags
   *   })
   *   → POST /api/albums
   *   응답: { albumId, message }
   *   성공 시: showAlert(message) + navigate('/snap/{albumId}')
   *
   * 에러 처리:
   *   e.response?.data?.message || e.message || '글 작성에 실패했습니다.'
   *   "업로드 실패" 알림 표시
   */
  const handleComplete = async () => {
    // TODO: [유효성 검사] title, content, photos.length===0, userId===null 체크
    if (!title.trim()) { showAlert('제목을 입력해주세요.', '입력 오류', 'alert'); return; }
    if (!content.trim()) { showAlert('내용을 입력해주세요.', '입력 오류', 'alert'); return; }
    if (photos.length === 0) { showAlert('사진을 1장 이상 업로드해주세요.', '입력 오류', 'alert'); return; }

    const userId = getCurrentUserId();
    if (!userId) {
      showAlert('로그인 정보가 없습니다. 다시 로그인해주세요.', '인증 오류', 'alert');
      navigate('/login');
      return;
    }
    setIsSubmitting(true);
    try {
      const uploadResult = await photoService.uploadPhotos({
        files: photos.map((p) => p.file),
        userId,
      });

      const uploadedPhotos = uploadResult?.photos ?? [];
      if (uploadedPhotos.length === 0) throw new Error('업로드된 사진 정보가 없습니다.');

      const photoIds = uploadedPhotos.map((p) => p.photoId);
      const slotIndexes = photoIds.map((_, i) => i); // [0, 1, 2, ...] 순서 인덱스


      // TODO: [단계 2] albumService.createAlbum({ userId, title, bodyText, recordDate, visibility, layoutType, photoIds, slotIndexes, tags }) 호출
      const result = await albumService.createAlbum({
        userId,
        title: title.trim(),
        bodyText: content.trim(),
        recordDate: selectedDate,
        visibility: VISIBILITY_MAP[visibility],
        layoutType: getLayoutType(selectedLayout),
        photoIds,
        slotIndexes,
        tags,
      });

      showAlert(result?.message || '스냅이 게시되었습니다!', '게시 완료', 'success');
      navigate(`/snap/${result.albumId}`, { state: { fromPage: 'create' } });
    } catch (e) {
      console.error(e);
      const message = e.response?.data?.message || e.message || '글 작성에 실패했습니다.';
      showAlert(message, '업로드 실패', 'alert');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 힌트: 성공 시 showAlert() + navigate(`/snap/${result.albumId}`), 실패 시 showAlert(에러메시지)
  // 힌트: setIsSubmitting(true) → try/catch/finally → setIsSubmitting(false)

  // canvasEditerPage에서 넘어온 이미지 수신
  useEffect(() => {
    const canvasData = location.state?.canvasFile;

    if (canvasData) {
      const newImage = {
        id: Date.now(),
        url: canvasData.url,
        file: canvasData.file,
        isCanvas: true
      };

      // 최신 상태(prev)를 기준으로 개수 체크 및 처리
      setPhotos(prev => {
        // 1. 이미 4장이 꽉 찬 경우
        if (prev.length >= 4) {
          showConfirm({
            title: "사진 개수 초과",
            message: "이미 4장의 사진이 등록되어 있습니다.\n마지막 사진을 현재 제작한 이미지로 교체할까요?",
            confirmText: "교체하기",
            cancelText: "유지하기",
            type: "alert",
            onConfirm: () => {
              setPhotos(current => [...current.slice(0, -1), newImage]);
              showAlert("마지막 사진이 제작한 이미지로 교체되었습니다.", "완료", "success");
            }
          });
          // Confirm 모달이 떴으므로 여기선 일단 기존 상태 유지
          return prev;
        }

        // 2. 4장 미만인 경우 (단순 추가)
        const updated = [...prev, newImage];

        // 추가된 후의 사진 수에 따라 레이아웃 자동 조정
        if (updated.length === 1) setSelectedLayout(1);
        else if (updated.length === 2) setSelectedLayout(2);
        else if (updated.length >= 4) setSelectedLayout(4);

        return updated;
      });

      // 데이터 중복 수신 방지를 위해 state 초기화
      window.history.replaceState({}, document.title);
      location.state.canvasFile = null;
    }
  }, [location.state]);

  return (
    // ResponsiveLayout 미사용 (페이지 전체가 독립적인 전체화면 레이아웃)
    <div className="min-h-screen bg-[#f9f9fa] dark:bg-[#101215] text-black dark:text-white transition-colors duration-300 pb-20">

      {/* ──────────────────────────────────────────────────────
          Header (sticky, top-0)
          - 좌측: ArrowLeft 버튼 → navigate(-1)
          - 가운데: "사진첩 창작" 제목
          - 우측: 여백 div (중앙 정렬 유지)
      ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between h-14 px-4 bg-white dark:bg-[#1c1f24] border-b border-[#e5e5e5] dark:border-[#292e35] sticky top-0 z-40 transition-colors duration-300">
        <button onClick={() => navigate(-1)} className="p-2">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-bold text-[16px]">사진첩 창작</h1>
        <div className="w-10"></div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">

        {/* ──────────────────────────────────────────────────────
            작성 날짜 선택
            - Calendar 아이콘 (좌측 내부 고정)
            - date input: selectedDate 상태와 연결
              onChange → setSelectedDate
            - API 의 recordDate 필드로 전달됨
        ────────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <h3 className="text-[14px] font-bold text-gray-500 dark:text-gray-400">작성 날짜</h3>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-white dark:bg-[#1c1f24] border border-[#e5e5e5] dark:border-[#292e35] rounded-xl text-[14px] font-bold outline-none focus:border-black dark:focus:border-white transition-all"
            />
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────
            사진 등록 (최대 4장)
            [업로드 버튼]
            - photos.length < 4 일 때만 표시 (4장 다 차면 숨김)
            - label + hidden file input (accept="image/*", multiple)
            - ImagePlus 아이콘 + "N/4" 카운트 텍스트

            [썸네일 목록]
            - 각 사진: 24×24 박스, 둥근 모서리
            - X 버튼: removePhoto(index) 호출로 해당 사진 제거

            [레이아웃 선택 패널] (사진이 1장 이상일 때만 표시)
            - "Step 2" 레이블 + "Pick Your Grid" 제목
            - getAvailableLayouts() 반환 레이아웃만 버튼으로 표시
            - 각 버튼:
              선택됨 (selectedLayout === layout.id):
                scale-110, 검정 테두리, 검정 격자 미리보기
              미선택:
                opacity-60 grayscale, hover 시 복원
            - 레이아웃 격자 미리보기:
              id=1: 격자 1칸, id=2|3: 2칸, id=4: 4칸
              칸 수 = layout.id === 1 ? 1 : (2 또는 3 ? 2 : 4)
            - 버튼 레이블:
              id=1 → 'Solo', id=2 → 'Twin H', id=3 → 'Twin V', id=4 → 'Quad'
        ────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <h3 className="text-[14px] font-bold text-gray-500 dark:text-gray-400">사진 등록 (최대 4장, 확장자 : "jpg", "jpeg", "png", "webp" 파일만 가능합니다)</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {/* 사진 추가 버튼 (4장 미만일 때만 표시) */}
            {photos.length < 4 && (
              <label className="flex-shrink-0 cursor-pointer">
                <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                <div className="w-24 h-24 border-2 border-dashed border-[#e5e5e5] dark:border-[#292e35] rounded-2xl bg-white dark:bg-[#1c1f24] flex flex-col items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <ImagePlus size={24} className="text-gray-400 mb-1" />
                  <span className="text-[11px] font-bold text-gray-400">{photos.length}/4</span>
                </div>
              </label>
            )}

            {/* 선택된 사진 썸네일 목록 */}
            {photos.map((photo, index) => (
              <div key={index} className="relative w-24 h-24 flex-shrink-0 rounded-2xl overflow-hidden shadow-sm border border-[#e5e5e5] dark:border-[#292e35]">
                <img src={photo.url} alt="" className="w-full h-full object-cover" />
                {/* X 버튼: 해당 인덱스 사진 제거 */}
                <button
                  onClick={() => removePhoto(index)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black transition-colors"
                >
                  <X size={14} strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>

          {/* 이미지를 직접 제작 원하는 경우 canvasEditerPage 이동 */}
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-[14px] font-bold text-gray-500 dark:text-gray-400">사진 등록 (최대 4장)</h3>
            <button
              onClick={() => navigate('/create-canvas')}
              className="text-[12px] font-bold text-indigo-500 flex items-center gap-1 hover:text-indigo-600 transition-colors"
            >
              🎨 캔버스에서 직접 만들기
            </button>
          </div>


          {/* 레이아웃 선택 패널 (사진 1장 이상일 때만 표시) */}
          {photos.length > 0 && (
            <div className="bg-white dark:bg-[#1c1f24] border border-[#e5e5e5] dark:border-[#292e35] rounded-[32px] p-6 shadow-sm mt-6 overflow-hidden relative">
              <div className="flex flex-col items-center gap-1 mb-6">
                <span className="text-[11px] font-black italic tracking-[3px] text-gray-400 uppercase">Step 2</span>
                <h4 className="text-[16px] font-black italic tracking-tighter uppercase">Pick Your Grid</h4>
              </div>

              {/* 레이아웃 버튼 목록 (getAvailableLayouts 반환값만) */}
              <div className="flex items-center justify-center gap-4">
                {getAvailableLayouts().map((layout) => (
                  <button
                    key={layout.id}
                    onClick={() => setSelectedLayout(layout.id)}
                    className={`relative w-20 flex flex-col items-center gap-3 transition-all duration-300 group ${selectedLayout === layout.id ? 'scale-110' : 'opacity-60 grayscale hover:opacity-100'
                      }`}
                  >
                    {/* 레이아웃 격자 미리보기 박스 */}
                    <div className={`w-full aspect-square rounded-2xl border-2 transition-all p-1.5 ${selectedLayout === layout.id ? 'border-black dark:border-white shadow-xl bg-gray-50 dark:bg-gray-800' : 'border-transparent bg-gray-100 dark:bg-gray-900'
                      }`}>
                      {/* 격자 미리보기: layout.grid 클래스로 형태 결정 */}
                      <div className={`w-full h-full ${layout.grid} gap-1 p-0.5 grid`}>
                        {/* 칸 수: id=1→1칸, id=2|3→2칸, id=4→4칸 */}
                        {Array(layout.id === 1 ? 1 : layout.id === 2 || layout.id === 3 ? 2 : 4)
                          .fill(0)
                          .map((_, i) => (
                            <div key={i} className={`rounded-[2px] ${selectedLayout === layout.id ? 'bg-black dark:bg-white' : 'bg-gray-400'}`} />
                          ))}
                      </div>
                    </div>
                    {/* 레이아웃 레이블 (선택됨: 항상 표시, 미선택: hover 시만 표시) */}
                    <span className={`text-[10px] font-black italic tracking-widest uppercase transition-all ${selectedLayout === layout.id ? 'text-black dark:text-white opacity-100' : 'text-gray-400 opacity-0 group-hover:opacity-100'
                      }`}>
                      {layout.id === 1 ? 'Solo' : layout.id === 2 ? 'Twin H' : layout.id === 3 ? 'Twin V' : 'Quad'}
                    </span>
                    {/* 선택된 레이아웃 하단 점 인디케이터 */}
                    {selectedLayout === layout.id && (
                      <div className="absolute -bottom-1 w-1 h-1 bg-black dark:bg-white rounded-full transition-all"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ──────────────────────────────────────────────────────
            제목 + 내용 입력
            제목: text input, title 상태 연결
            내용: textarea (h-48, resize-none), content 상태 연결
                  "오늘의 이야기를 들려주세요 (최대 2000자)" placeholder
        ────────────────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* 제목 입력 */}
          <div className="space-y-3">
            <h3 className="text-[14px] font-bold text-gray-500 dark:text-gray-400">제목</h3>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="w-full h-12 px-4 bg-white dark:bg-[#1c1f24] border border-[#e5e5e5] dark:border-[#292e35] rounded-xl text-[14px] font-bold outline-none focus:border-black dark:focus:border-white transition-all shadow-sm"
            />
          </div>

          {/* 내용 입력 */}
          <div className="space-y-3">
            <h3 className="text-[14px] font-bold text-gray-500 dark:text-gray-400">내용</h3>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="오늘의 이야기를 들려주세요 (최대 2000자)"
              className="w-full h-48 p-4 bg-white dark:bg-[#1c1f24] border border-[#e5e5e5] dark:border-[#292e35] rounded-2xl resize-none text-[14px] font-medium leading-relaxed outline-none focus:border-black dark:focus:border-white transition-all shadow-sm"
            />
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────
            태그 입력
            - tagInput 상태와 연결된 text input
            - 엔터 키: handleAddTag() 호출 (기본 submit 방지)
            - "추가" 버튼: handleAddTag() 호출
            - 추가된 태그들: 칩(chip) 형태로 표시
              각 칩: "#{tag}" 텍스트 + X 버튼(handleRemoveTag)
            - tags 배열이 비어있으면 태그 칩 영역 미표시
        ────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <h3 className="text-[14px] font-bold text-gray-500 dark:text-gray-400">태그</h3>
          <div className="flex gap-2">
            {/* 태그 입력창: 엔터로 추가 */}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              placeholder="# 태그 입력 후 엔터"
              className="flex-1 h-12 px-4 bg-white dark:bg-[#1c1f24] border border-[#e5e5e5] dark:border-[#292e35] rounded-xl text-[14px] font-bold outline-none focus:border-black dark:focus:border-white transition-all"
            />
            {/* "추가" 버튼 */}
            <button
              onClick={handleAddTag}
              className="px-6 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-[14px] active:scale-95 transition-all"
            >
              추가
            </button>
          </div>
          {/* 태그 칩 목록 (tags 배열이 있을 때만 표시) */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-4 py-1.5 bg-gray-100 dark:bg-[#1c1f24] text-gray-600 dark:text-gray-300 font-bold rounded-full text-[12px] flex items-center gap-2 border border-[#e5e5e5] dark:border-[#292e35]"
                >
                  #{tag}
                  {/* X 버튼: 해당 태그 제거 */}
                  <button onClick={() => handleRemoveTag(tag)} className="hover:text-black dark:hover:text-white transition-colors">
                    <X size={12} strokeWidth={3} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ──────────────────────────────────────────────────────
            공개범위 설정
            3개 버튼: 나만보기 / 글벗만 / 전체공개
            각 버튼 클릭 시 setVisibility(option.value) 호출
            선택된 버튼: 검정 배경 + 흰색 텍스트 (다크: 반전)
            미선택 버튼: 흰색 배경 + 회색 텍스트
            VISIBILITY_MAP 을 통해 API 값으로 변환됨:
              'private' → 'PRIVATE'
              'friends' → 'FRIENDS_ONLY'
              'public'  → 'PUBLIC'
        ────────────────────────────────────────────────────── */}
        <div className="pt-6 border-t border-[#e5e5e5] dark:border-[#292e35]">
          <h3 className="text-[14px] font-bold text-gray-500 dark:text-gray-400 mb-4 text-center">공개범위 설정</h3>
          <div className="flex gap-3 max-w-sm mx-auto">
            {[
              { value: 'private', label: '나만보기' },    // → PRIVATE
              { value: 'friends', label: '글벗만' },      // → FRIENDS_ONLY
              { value: 'public', label: '전체공개' },    // → PUBLIC
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setVisibility(option.value)}
                className={`flex-1 py-3 rounded-xl text-center transition-all font-bold text-[13px] border ${visibility === option.value
                  ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'  // 선택됨
                  : 'border-[#e5e5e5] dark:border-[#292e35] bg-white dark:bg-[#1c1f24] text-gray-400'   // 미선택
                  }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────
            Post Snap 버튼 (게시 버튼)
            - disabled 조건: content.trim() 비어있음 OR isSubmitting === true
            - isSubmitting 중:
                Loader2 스피너 + "Checking..." 텍스트
            - 대기 중:
                "Post Snap" 텍스트 (대문자 이탤릭)
            - active:scale-95 로 클릭 피드백 제공
        ────────────────────────────────────────────────────── */}
        <button
          onClick={handleComplete}
          disabled={!content.trim() || isSubmitting}
          className="w-full h-14 bg-black dark:bg-white text-white dark:text-black rounded-xl disabled:opacity-50 font-black italic tracking-widest text-[16px] shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all uppercase"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              <span>Checking...</span>
            </>
          ) : (
            'Post Snap'
          )}
        </button>
      </div>
    </div>
  );
}
