/**
 * @file EditPostPage.jsx
 * @route /snap/:id/edit
 *
 * @description
 * 기존 스냅 게시물을 수정하는 페이지.
 * CreatePhotoAlbumPage 를 기준으로 동일한 레이아웃/UX 를 따르며,
 * 마운트 시 기존 게시물 데이터를 로드하여 모든 입력창을 미리 채운다.
 * 사진 교체/추가/삭제, 레이아웃 변경, 제목/내용/태그/공개범위/날짜 수정 후
 * "UPDATE SNAP" 버튼으로 저장한다.
 *
 * @layout
 * ┌─────────────────────────────────────────┐
 * │  [Header] (sticky)                      │
 * │    ← 뒤로가기    스냅 수정              │
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
 * │  [UPDATE SNAP 버튼]                     │
 * └─────────────────────────────────────────┘
 *
 * @urlParams
 *   id {string} - URL 파라미터. 수정할 게시물의 ID.
 *
 * @constants
 *   layouts[]
 *     { id: 1, name: '1장',      grid: 'grid-cols-1',             apiValue: 'single' }
 *     { id: 2, name: '2장 가로', grid: 'grid-cols-2',             apiValue: 'horizontal-two' }
 *     { id: 3, name: '2장 세로', grid: 'grid-rows-2',             apiValue: 'vertical-two' }
 *     { id: 4, name: '4장',      grid: 'grid-cols-2 grid-rows-2', apiValue: 'grid' }
 *
 *   VISIBILITY_MAP
 *     private → 'PRIVATE'
 *     friends → 'FRIENDS'
 *     public  → 'PUBLIC'
 *
 *   VISIBILITY_REVERSE_MAP (API값 → UI값 역매핑, 로드 시 사용)
 *     'PRIVATE' → 'private'
 *     'FRIENDS' → 'friends'
 *     'PUBLIC'  → 'public'
 *
 * @state
 *   photos         - 사진 배열. 기존: { url, file: null, isExisting: true }
 *                    신규: { url, file: File, isExisting: false }
 *                    최대 4장 제한.
 *   selectedLayout - 현재 선택된 레이아웃 ID (1~4).
 *   title          - 제목 입력값. 로드 시 post.title 로 초기화.
 *   content        - 내용 입력값. 로드 시 post.bodyText 로 초기화.
 *   tags           - 태그 배열. 로드 시 post.tags 로 초기화.
 *   tagInput       - 태그 입력창 임시 값.
 *   visibility     - 공개범위. 'private' | 'friends' | 'public'. 로드 시 초기화.
 *   selectedDate   - 작성 날짜 (YYYY-MM-DD). 로드 시 post.recordDate 로 초기화.
 *   isSubmitting   - UPDATE SNAP API 호출 중 여부.
 *   isLoading      - 마운트 시 데이터 로드 중 여부.
 *
 * @api
 *   [로드] postService.getPost(id)
 *          → GET /api/albums/{id}
 *          성공: 모든 폼 상태 초기화
 *          실패: showAlert + navigate(-1)
 *
 *   [사진 업로드] photoService.uploadPhotos({ files, userId })
 *          → POST /api/photos/upload (신규 사진이 있을 때만 호출)
 *          응답: { photos: [{ photoId }] }
 *
 *   [수정] albumService.updateAlbum(id, { userId, title, bodyText, recordDate,
 *                                         visibility, layoutType, photoIds,
 *                                         slotIndexes, tags })
 *          → PUT /api/albums/{id}
 *          성공: showAlert('수정되었습니다.') + navigate('/snap/{id}')
 *          실패: showAlert('수정에 실패했습니다.')
 *
 * @note
 *   - 기존 사진(isExisting: true)은 photoId 를 그대로 재사용
 *   - 신규 사진(isExisting: false)은 uploadPhotos 로 업로드 후 photoId 획득
 *   - UPDATE SNAP 클릭 시 showConfirm 으로 최종 확인 후 API 호출
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, X, Calendar, Loader2, ImagePlus } from 'lucide-react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { postService } from '@/api/postService';
import { photoService } from '@/api/photoService';
import { albumService } from '@/api/albumService';
import { useAlert } from '@/context/AlertContext';

/**
 * @constant layouts
 * 사진 레이아웃 옵션 목록. CreatePhotoAlbumPage 와 동일.
 * apiValue 는 PUT /api/albums/{id} 의 layoutType 필드 값으로 사용됨.
 */
const layouts = [
    { id: 1, name: '1장', grid: 'grid-cols-1', apiValue: 'single' },
    { id: 2, name: '2장 가로', grid: 'grid-cols-2', apiValue: 'horizontal-two' },
    { id: 3, name: '2장 세로', grid: 'grid-rows-2', apiValue: 'vertical-two' },
    { id: 4, name: '4장', grid: 'grid-cols-2 grid-rows-2', apiValue: 'grid' },
];

/**
 * @constant VISIBILITY_MAP
 * UI 공개범위 문자열 → API 값 매핑.
 */
const VISIBILITY_MAP = {
    private: 'PRIVATE',
    friends: 'FRIENDS',
    public: 'PUBLIC',
};

/**
 * @constant VISIBILITY_REVERSE_MAP
 * API 값 → UI 공개범위 문자열 역매핑. 게시물 로드 시 사용.
 */
const VISIBILITY_REVERSE_MAP = {
    PRIVATE: 'private',
    FRIENDS: 'friends',
    PUBLIC: 'public',
};

export default function EditPostPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    /**
     * showAlert  : 완료/실패 메시지 알림 모달
     * showConfirm: 수정 최종 확인 모달
     */
    const { showAlert, showConfirm } = useAlert();

    // ---------------------------------------------------------
    // [상태 변수]
    // ---------------------------------------------------------

    /**
     * @state photos
     * 사진 배열. 최대 4장.
     * - 기존 사진: { url: string, file: null, isExisting: true,  photoId: number }
     * - 신규 사진: { url: string, file: File, isExisting: false, photoId: null  }
     * 로드 시 rawSnap.photos 배열을 isExisting: true 형태로 변환하여 초기화.
     */
    const [photos, setPhotos] = useState([]);

    /**
     * @state selectedLayout
     * 현재 선택된 레이아웃 ID (1~4).
     * 로드 시 post.layoutType(apiValue) 으로 초기화.
     * 사진 추가/삭제 시 자동 재조정됨.
     */
    const [selectedLayout, setSelectedLayout] = useState(1);

    /**
     * @state title
     * 제목 입력값. 로드 시 post.title 로 초기화.
     */
    const [title, setTitle] = useState('');

    /**
     * @state content
     * 내용 입력값(본문). 로드 시 post.bodyText 로 초기화.
     * UPDATE SNAP 버튼은 content.trim() 이 비어있으면 disabled.
     */
    const [content, setContent] = useState('');

    /**
     * @state tags
     * 태그 배열. 로드 시 post.tags 로 초기화.
     * handleAddTag 로 추가, X 버튼으로 제거.
     */
    const [tags, setTags] = useState([]);

    /**
     * @state tagInput
     * 태그 입력창 임시 값.
     * 엔터 키 또는 "추가" 버튼으로 handleAddTag 호출 후 '' 로 초기화.
     */
    const [tagInput, setTagInput] = useState('');

    /**
     * @state visibility
     * 공개범위. 'private' | 'friends' | 'public'.
     * 로드 시 VISIBILITY_REVERSE_MAP[post.visibility] 로 초기화.
     */
    const [visibility, setVisibility] = useState('private');

    /**
     * @state selectedDate
     * 작성 날짜 (YYYY-MM-DD).
     * 로드 시 post.recordDate 로 초기화.
     */
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    /**
     * @state isSubmitting
     * UPDATE SNAP API 호출 중 여부.
     * true 이면 버튼 disabled + Loader2 스피너 표시.
     * finally 에서 항상 false 로 전환.
     */
    const [isSubmitting, setIsSubmitting] = useState(false);

    /**
     * @state isLoading
     * 마운트 시 게시물 로드 중 여부.
     * true 이면 전체 페이지 로딩 화면 표시.
     * useEffect finally 에서 false 로 전환.
     */
    const [isLoading, setIsLoading] = useState(true);

    // ---------------------------------------------------------
    // [useEffect] 기존 게시물 데이터 로드 → 모든 폼 초기값 세팅
    //
    // 동작:
    //   1. postService.getPost(id) 호출 → GET /api/albums/{id}
    //   2. 성공:
    //      - photos: rawSnap.photos 를 slotIndex 오름차순 정렬 후
    //                { url: photoUrl, file: null, isExisting: true, photoId } 형태로 변환
    //      - selectedLayout: layoutType apiValue → layouts 에서 id 역탐색
    //      - title, content(bodyText), tags, visibility, selectedDate 초기화
    //   3. 실패: showAlert + navigate(-1)
    //   4. finally: setIsLoading(false)
    // ---------------------------------------------------------
    useEffect(() => {
        const loadPost = async () => {
            try {
                const post = await postService.getPost(id);
                console.log('[EditPostPage] getPost 성공, post =', post);

                // 기존 사진 → isExisting: true 형태로 변환 (slotIndex 오름차순 정렬)
                const existingPhotos = (post.photos || [])
                    .slice()
                    .sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0))
                    .map(p => ({
                        url: p.photoUrl,
                        file: null,
                        isExisting: true,
                        photoId: p.photoId,
                    }));

                console.log('[EditPostPage] existingPhotos =', existingPhotos);

                // layoutType apiValue → layouts id 역탐색
                const matchedLayout = layouts.find(l => l.apiValue === post.layoutType);
                const layoutId = matchedLayout?.id ?? 1;

                console.log('[EditPostPage] matchedLayout =', matchedLayout);

                setPhotos(existingPhotos);
                setSelectedLayout(layoutId);
                setTitle(post.title || '');
                setContent(post.bodyText || post.content || post.preview || '');
                setTags(post.tags || []);
                setVisibility(VISIBILITY_REVERSE_MAP[post.visibility] ?? 'private');
                setSelectedDate(
                    post.recordDate
                        ? post.recordDate.split('T')[0]
                        : new Date().toISOString().split('T')[0]
                );
            } catch (err) {
                console.log('[EditPostPage] getPost 실패, err =', err);
                showAlert('게시글을 불러오는데 실패했습니다.', '알림');
                navigate(-1);
            } finally {
                setIsLoading(false);
            }
        };
        loadPost();
    }, [id, navigate]);

    // ---------------------------------------------------------
    // [handlePhotoUpload] 신규 사진 추가
    //
    // 동작:
    //   1. e.target.files 에서 File 배열 추출
    //   2. 각 File 을 { url, file, isExisting: false, photoId: null } 로 변환
    //   3. 기존 photos + 새 항목을 합쳐 최대 4장으로 제한
    //   4. 사진 수에 따라 selectedLayout 자동 조정
    //
    // 트리거: file input 의 onChange (accept="image/*", multiple)
    // ---------------------------------------------------------
    const handlePhotoUpload = (e) => {
        console.log('[handlePhotoUpload] 호출');

        const files = e.target.files;
        if (!files) return;

        const newPhotoObjects = Array.from(files).map(file => ({
            url: URL.createObjectURL(file),
            file: file,
            isExisting: false,
            photoId: null,
        }));

        const updatedPhotos = [...photos, ...newPhotoObjects].slice(0, 4);
        console.log('[handlePhotoUpload] updatedPhotos =', updatedPhotos);

        setPhotos(updatedPhotos);
        autoSetLayout(updatedPhotos.length);

        // input 초기화 (같은 파일 재선택 허용)
        e.target.value = '';
    };

    /**
     * @function removePhoto
     * @param {number} index - 제거할 사진의 배열 인덱스
     *
     * 해당 인덱스의 사진을 photos 에서 제거하고 레이아웃 자동 재조정.
     * 트리거: 각 썸네일의 X 버튼 클릭
     */
    const removePhoto = (index) => {
        console.log('[removePhoto] 제거할 index =', index);

        const newPhotos = photos.filter((_, i) => i !== index);
        console.log('[removePhoto] newPhotos =', newPhotos);

        setPhotos(newPhotos);
        autoSetLayout(newPhotos.length);
    };

    /**
     * @function autoSetLayout
     * @param {number} count - 현재 사진 수
     *
     * 사진 수에 따라 selectedLayout 을 자동으로 적절한 값으로 조정.
     *   1장 → id=1, 2장 → id=2, 4장+ → id=4
     */
    const autoSetLayout = (count) => {
        if (count === 1) setSelectedLayout(1);
        else if (count === 2) setSelectedLayout(2);
        else if (count >= 4) setSelectedLayout(4);
    };

    /**
     * @function getAvailableLayouts
     * 현재 사진 수에 따라 선택 가능한 레이아웃 목록 반환.
     * CreatePhotoAlbumPage 와 동일한 규칙.
     *   0장 → []
     *   1장 → [id=1]
     *   2~3장 → [id=2, id=3]
     *   4장 → [id=4]
     */
    const getAvailableLayouts = () => {
        if (photos.length === 0) return [];
        if (photos.length === 1) return layouts.filter(l => l.id === 1);
        if (photos.length <= 3) return layouts.filter(l => l.id === 2 || l.id === 3);
        return layouts.filter(l => l.id === 4);
    };

    /**
     * @function handleAddTag
     * tagInput 의 값을 tags 배열에 추가.
     * 빈 값 또는 중복 시 무시.
     * 트리거: 태그 입력창 Enter 키 또는 "추가" 버튼 클릭
     */
    const handleAddTag = () => {
        console.log('[handleAddTag] tagInput =', tagInput);
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    /**
     * @function getLayoutType
     * @param {number} layoutId - layouts 배열의 id
     * @returns {string} API 전송용 layoutType 문자열
     */
    const getLayoutType = (layoutId) => {
        return layouts.find(l => l.id === layoutId)?.apiValue ?? 'single';
    };

    /**
     * @function getCurrentUserId
     * localStorage['user'] 에서 userId 추출.
     * 파싱 실패 시 null 반환.
     */
    const getCurrentUserId = () => {
        try {
            const raw = localStorage.getItem('user');
            return raw ? JSON.parse(raw)?.id ?? null : null;
        } catch {
            return null;
        }
    };

    // ---------------------------------------------------------
    // [handleUpdate] UPDATE SNAP 버튼 핸들러
    //
    // 동작:
    //   1. 입력값 유효성 검사 (title, content, photos 최소 1장)
    //   2. showConfirm 으로 최종 확인 모달 표시
    //   3. 확인 시:
    //      a. 신규 사진(isExisting: false)이 있으면 photoService.uploadPhotos 호출
    //         → 신규 photoId 획득
    //      b. 기존 사진(isExisting: true)의 photoId 는 그대로 재사용
    //      c. photos 배열 순서대로 photoIds + slotIndexes 구성
    //      d. albumService.updateAlbum(id, { ... }) 호출
    //      e. 성공: showAlert('수정되었습니다.') + navigate('/snap/{id}')
    //      f. 실패: showAlert('수정에 실패했습니다.')
    //   4. finally: setIsSubmitting(false)
    // ---------------------------------------------------------
    const handleUpdate = () => {
        if (!title.trim()) { showAlert('제목을 입력해주세요.', '입력 오류', 'alert'); return; }
        if (!content.trim()) { showAlert('내용을 입력해주세요.', '입력 오류', 'alert'); return; }
        if (photos.length === 0) { showAlert('사진을 1장 이상 등록해주세요.', '입력 오류', 'alert'); return; }

        showConfirm({
            message: '스냅을 수정하시겠습니까?',
            title: '스냅 수정',
            type: 'info',
            confirmText: '수정',
            cancelText: '취소',
            onConfirm: async () => {
                setIsSubmitting(true);

                const userId = getCurrentUserId();
                if (!userId) {
                    showAlert('로그인 정보가 없습니다. 다시 로그인해주세요.', '인증 오류', 'alert');
                    navigate('/login');
                    setIsSubmitting(false);
                    return;
                }

                try {
                    // [1] 신규 사진만 추려서 업로드
                    const newPhotos = photos.filter(p => !p.isExisting);
                    console.log('[handleUpdate] 신규 사진 수 =', newPhotos.length);

                    let newPhotoIds = [];
                    if (newPhotos.length > 0) {
                        const uploadResult = await photoService.uploadPhotos({
                            files: newPhotos.map(p => p.file),
                            userId,
                        });
                        console.log('[handleUpdate] uploadResult =', uploadResult);

                        newPhotoIds = (uploadResult?.photos ?? []).map(p => p.photoId);
                        if (newPhotoIds.length === 0) throw new Error('업로드된 사진 정보가 없습니다.');
                    }

                    // [2] photos 순서대로 photoId 배열 구성
                    // 기존 사진: 원래 photoId 사용
                    // 신규 사진: uploadResult 에서 순서대로 할당
                    let newIdx = 0;
                    const photoIds = photos.map(p => {
                        if (p.isExisting) return p.photoId;
                        return newPhotoIds[newIdx++];
                    });
                    const slotIndexes = photoIds.map((_, i) => i);

                    console.log('[handleUpdate] photoIds =', photoIds);
                    console.log('[handleUpdate] slotIndexes =', slotIndexes);

                    // [3] 앨범 수정 API 호출
                    const result = await albumService.updateAlbum(id, {
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

                    console.log('[handleUpdate] updateAlbum 성공, result =', result);
                    showAlert('수정되었습니다.', '완료', 'success');
                    navigate(`/snap/${id}`);
                } catch (err) {
                    console.log('[handleUpdate] 실패, err =', err);
                    const message = err.response?.data?.message || err.message || '수정에 실패했습니다.';
                    showAlert(message, '수정 실패', 'alert');
                } finally {
                    setIsSubmitting(false);
                }
            },
        });
    };

    // ---------------------------------------------------------
    // [조기 반환] 로딩 중
    // ---------------------------------------------------------
    if (isLoading) return (
        <div className="min-h-screen bg-[#f9f9fa] dark:bg-[#101215] flex items-center justify-center">
            <div className="font-bold italic opacity-20 animate-pulse uppercase tracking-widest">
                Loading...
            </div>
        </div>
    );

    return (
        // showTabs={false}: 하단 내비게이션 탭 숨김
        <ResponsiveLayout showTabs={false}>
            <div className="min-h-screen bg-[#f9f9fa] dark:bg-[#101215] text-black dark:text-white transition-colors duration-300 pb-20">

                {/* ── Header (sticky) ── */}
                <div className="flex items-center justify-between h-14 px-4 bg-white dark:bg-[#1c1f24] border-b border-[#e5e5e5] dark:border-[#292e35] sticky top-0 z-40 transition-colors duration-300">
                    <button onClick={() => navigate(-1)} className="p-2">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="font-bold text-[16px]">스냅 수정</h1>
                    <div className="w-10" />
                </div>

                <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">

                    {/* ── 작성 날짜 선택 ── */}
                    <div className="space-y-3">
                        <h3 className="text-[14px] font-bold text-gray-500 dark:text-gray-400">작성 날짜</h3>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => {
                                    console.log('[UI] selectedDate 변경 =', e.target.value);
                                    setSelectedDate(e.target.value);
                                }}
                                className="w-full h-12 pl-12 pr-4 bg-white dark:bg-[#1c1f24] border border-[#e5e5e5] dark:border-[#292e35] rounded-xl text-[14px] font-bold outline-none focus:border-black dark:focus:border-white transition-all"
                            />
                        </div>
                    </div>

                    {/* ── 사진 등록 (최대 4장) ──
                        기존 사진(isExisting: true): 서버 URL 로 미리보기
                        신규 사진(isExisting: false): ObjectURL 로 미리보기
                        각 썸네일 X 버튼으로 제거 가능.
                        4장 미만일 때만 + 버튼 표시.
                    ── */}
                    <div className="space-y-4">
                        <h3 className="text-[14px] font-bold text-gray-500 dark:text-gray-400">
                            사진 등록 (최대 4장, 확장자 : "jpg", "jpeg", "png", "webp" 파일만 가능합니다)
                        </h3>

                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                            {/* + 추가 버튼: 4장 미만일 때만 표시 */}
                            {photos.length < 4 && (
                                <label className="flex-shrink-0 cursor-pointer">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handlePhotoUpload}
                                        className="hidden"
                                    />
                                    <div className="w-24 h-24 border-2 border-dashed border-[#e5e5e5] dark:border-[#292e35] rounded-2xl bg-white dark:bg-[#1c1f24] flex flex-col items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                        <ImagePlus size={24} className="text-gray-400 mb-1" />
                                        <span className="text-[11px] font-bold text-gray-400">{photos.length}/4</span>
                                    </div>
                                </label>
                            )}

                            {/* 사진 썸네일 목록 */}
                            {photos.map((photo, index) => (
                                <div key={index} className="relative w-24 h-24 flex-shrink-0 rounded-2xl overflow-hidden shadow-sm border border-[#e5e5e5] dark:border-[#292e35]">
                                    <img src={photo.url} alt="" className="w-full h-full object-cover" />
                                    {/* 신규 사진 표시 뱃지 */}
                                    {!photo.isExisting && (
                                        <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                            NEW
                                        </div>
                                    )}
                                    <button
                                        onClick={() => removePhoto(index)}
                                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black transition-colors"
                                    >
                                        <X size={14} strokeWidth={3} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* ── 레이아웃 선택 (사진이 1장 이상일 때만 표시) ──
                            사진 수에 따라 getAvailableLayouts() 가 반환한 레이아웃만 표시.
                            선택된 레이아웃은 scale-110 + border-black 강조.
                        ── */}
                        {photos.length > 0 && (
                            <div className="bg-white dark:bg-[#1c1f24] border border-[#e5e5e5] dark:border-[#292e35] rounded-[32px] p-6 shadow-sm mt-6 overflow-hidden relative">
                                <div className="flex flex-col items-center gap-1 mb-6">
                                    <span className="text-[11px] font-black italic tracking-[3px] text-gray-400 uppercase">Step 2</span>
                                    <h4 className="text-[16px] font-black italic tracking-tighter uppercase">Pick Your Grid</h4>
                                </div>

                                <div className="flex items-center justify-center gap-4">
                                    {getAvailableLayouts().map((layout) => (
                                        <button
                                            key={layout.id}
                                            onClick={() => {
                                                console.log('[UI] 레이아웃 선택 =', layout);
                                                setSelectedLayout(layout.id);
                                            }}
                                            className={`relative w-20 flex flex-col items-center gap-3 transition-all duration-300 group ${selectedLayout === layout.id
                                                ? 'scale-110'
                                                : 'opacity-60 grayscale hover:opacity-100'
                                                }`}
                                        >
                                            <div className={`w-full aspect-square rounded-2xl border-2 transition-all p-1.5 ${selectedLayout === layout.id
                                                ? 'border-black dark:border-white shadow-xl bg-gray-50 dark:bg-gray-800'
                                                : 'border-transparent bg-gray-100 dark:bg-gray-900'
                                                }`}>
                                                <div className={`w-full h-full ${layout.grid} gap-1 p-0.5 grid`}>
                                                    {Array(layout.id === 1 ? 1 : layout.id === 2 || layout.id === 3 ? 2 : 4)
                                                        .fill(0)
                                                        .map((_, i) => (
                                                            <div
                                                                key={i}
                                                                className={`rounded-[2px] ${selectedLayout === layout.id
                                                                    ? 'bg-black dark:bg-white'
                                                                    : 'bg-gray-400'
                                                                    }`}
                                                            />
                                                        ))}
                                                </div>
                                            </div>
                                            <span className={`text-[10px] font-black italic tracking-widest uppercase transition-all ${selectedLayout === layout.id
                                                ? 'text-black dark:text-white opacity-100'
                                                : 'text-gray-400 opacity-0 group-hover:opacity-100'
                                                }`}>
                                                {layout.id === 1 ? 'Solo' : layout.id === 2 ? 'Twin H' : layout.id === 3 ? 'Twin V' : 'Quad'}
                                            </span>
                                            {selectedLayout === layout.id && (
                                                <div className="absolute -bottom-1 w-1 h-1 bg-black dark:bg-white rounded-full" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── 제목 + 내용 입력 ── */}
                    <div className="space-y-6">
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

                    {/* ── 태그 입력 ── */}
                    <div className="space-y-4">
                        <h3 className="text-[14px] font-bold text-gray-500 dark:text-gray-400">태그</h3>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                placeholder="# 태그 입력 후 엔터"
                                className="flex-1 h-12 px-4 bg-white dark:bg-[#1c1f24] border border-[#e5e5e5] dark:border-[#292e35] rounded-xl text-[14px] font-bold outline-none focus:border-black dark:focus:border-white transition-all"
                            />
                            <button
                                onClick={handleAddTag}
                                className="px-6 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-[14px] active:scale-95 transition-all"
                            >
                                추가
                            </button>
                        </div>
                        {/* 태그 칩 목록 */}
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {tags.map(tag => (
                                    <span
                                        key={tag}
                                        className="px-4 py-1.5 bg-gray-100 dark:bg-[#1c1f24] text-gray-600 dark:text-gray-300 font-bold rounded-full text-[12px] flex items-center gap-2 border border-[#e5e5e5] dark:border-[#292e35]"
                                    >
                                        #{tag}
                                        <button
                                            onClick={() => setTags(tags.filter(t => t !== tag))}
                                            className="hover:text-black dark:hover:text-white transition-colors"
                                        >
                                            <X size={12} strokeWidth={3} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── 공개범위 설정 ──
                        3가지 옵션: 나만보기(private) / 글벗만(friends) / 전체공개(public)
                        선택된 옵션: bg-black 강조 스타일.
                        로드 시 기존 게시물의 visibility 로 초기 선택.
                    ── */}
                    <div className="pt-6 border-t border-[#e5e5e5] dark:border-[#292e35]">
                        <h3 className="text-[14px] font-bold text-gray-500 dark:text-gray-400 mb-4 text-center">공개범위 설정</h3>
                        <div className="flex gap-3 max-w-sm mx-auto">
                            {[
                                { value: 'private', label: '나만보기' },
                                { value: 'friends', label: '글벗만' },
                                { value: 'public', label: '전체공개' },
                            ].map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        console.log('[UI] visibility 변경 =', option.value);
                                        setVisibility(option.value);
                                    }}
                                    className={`flex-1 py-3 rounded-xl text-center transition-all font-bold text-[13px] border ${visibility === option.value
                                        ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                                        : 'border-[#e5e5e5] dark:border-[#292e35] bg-white dark:bg-[#1c1f24] text-gray-400'
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── UPDATE SNAP 버튼 ──
                        disabled 조건: content.trim() 비어있음 OR isSubmitting === true
                        isSubmitting 중: Loader2 스피너 표시
                        클릭: handleUpdate() → showConfirm → updateAlbum API 호출
                    ── */}
                    <button
                        onClick={handleUpdate}
                        disabled={!content.trim() || isSubmitting}
                        className="w-full h-14 bg-black dark:bg-white text-white dark:text-black rounded-xl disabled:opacity-50 font-black italic tracking-widest text-[16px] shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all uppercase"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                <span>Updating...</span>
                            </>
                        ) : (
                            'UPDATE SNAP'
                        )}
                    </button>
                </div>
            </div>
        </ResponsiveLayout>
    );
}