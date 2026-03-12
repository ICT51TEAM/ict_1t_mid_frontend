/**
 * @file EditProfilePage.jsx
 * @route /profile/edit
 * @description 로그인한 사용자가 자신의 프로필을 수정하는 페이지.
 *
 * [화면 구성]
 *   1. 상단 고정 헤더 - 뒤로가기 버튼(ArrowLeft) / "EDIT PROFILE" 제목 / "완료" 버튼
 *   2. 프로필 이미지 영역 - 원형 이미지 클릭 또는 버튼 클릭으로 파일 선택
 *   3. 폼 영역 - 이름(username) 입력 필드 / 계정 공개 여부(visibility) 셀렉트
 *
 * [주요 동작 흐름]
 *   1. 마운트 시 userService.getMyProfile()로 현재 프로필 정보 로드
 *   2. 이미지 선택 → handleFileChange에서 Blob URL 생성하여 즉시 미리보기
 *   3. "완료" 버튼 클릭 → handleSubmit 호출:
 *      Step 1: 새 이미지가 선택된 경우 → POST /api/users/me/profile-image (multipart/form-data)
 *              응답에서 새 profileImageUrl을 받아 AuthContext에 반영
 *      Step 2: 이름/공개여부 → PUT /api/users/me { username, visibility }
 *              성공 후 AuthContext의 updateUser() 호출로 메모리 상태 동기화
 *   4. 저장 완료 후 /profile로 이동
 *
 * [상태 변수]
 *   @state {object|null} user         - API에서 로드한 현재 프로필 데이터
 *   @state {boolean}     isLoading    - 초기 프로필 로드 중 여부 (스피너 표시용)
 *   @state {boolean}     isSaving     - 저장 요청 진행 중 여부 (완료 버튼 비활성화용)
 *   @state {File|null}   profileFile  - 사용자가 선택한 새 프로필 이미지 File 객체
 *                                       null이면 이미지 변경 없음 → Step 1 건너뜀
 *   @state {string|null} previewUrl   - profileFile로 생성된 Blob URL
 *                                       화면에 즉시 미리보기용, 서버 업로드 전에 사용
 *   @state {object}      formData     - 폼 입력값
 *       formData.username    {string} - 사용자명 (기본값: 현재 username)
 *       formData.visibility  {string} - 공개 여부 'PUBLIC' | 'PRIVATE' (기본값: 'PUBLIC')
 *
 * [refs]
 *   fileInputRef: hidden <input type="file"> DOM 요소 참조.
 *     - accept: "image/jpeg,image/png,image/webp"
 *     - 이미지 클릭 또는 "프로필 사진 변경" 버튼 클릭 시 fileInputRef.current.click() 호출
 *     - 직접 DOM을 통해 파일 선택 다이얼로그를 여는 방식 (커스텀 UI 유지 위해 hidden 처리)
 */
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { ArrowLeft, Camera, Loader2 } from 'lucide-react';
import { userService } from '@/api/userService';
import { useAuth } from '@/context/AuthContext';
import { DEFAULT_AVATAR } from '@/utils/imageUtils';
import { useAlert } from '@/context/AlertContext';

export default function EditProfilePage() {
    const navigate = useNavigate();

    // AuthContext에서 현재 로그인 사용자 정보와 메모리 상태 갱신 함수를 가져온다.
    // updateUser: { key: value } 형태로 authUser의 일부 필드만 업데이트 가능.
    const { user: authUser, updateUser } = useAuth();
    const { showAlert } = useAlert();

    // -------------------------------------------------------------------------
    // [상태 변수 선언]
    // -------------------------------------------------------------------------

    /**
     * user: API에서 로드한 현재 프로필 전체 데이터.
     * null이면 isLoading 중이거나 로드 실패 상태.
     */
    const [user, setUser] = useState(null);

    /**
     * isLoading: 초기 프로필 데이터 로드 중 여부.
     * true일 때 → 전체 화면 스피너 표시 (Loader2 컴포넌트).
     * loadUser() 완료 후 finally에서 false로 설정.
     */
    const [isLoading, setIsLoading] = useState(true);

    /**
     * isSaving: 저장(handleSubmit) 진행 중 여부.
     * true일 때 → 상단 "완료" 버튼에 disabled 적용 + "저장 중..." 텍스트 표시.
     * 중복 제출 방지 목적.
     */
    const [isSaving, setIsSaving] = useState(false);

    /**
     * profileFile: 사용자가 파일 선택 다이얼로그에서 고른 이미지 File 객체.
     * null이면 이미지를 변경하지 않은 것 → handleSubmit Step 1을 건너뜀.
     * handleFileChange에서 e.target.files[0]으로 설정.
     */
    const [profileFile, setProfileFile] = useState(null);

    /**
     * previewUrl: profileFile을 URL.createObjectURL()로 생성한 Blob URL.
     * 서버에 업로드하기 전에 브라우저에서 이미지를 즉시 미리보기 위해 사용.
     * null이면 현재 저장된 프로필 이미지(user.profileImageUrl 등)를 표시.
     * 컴포넌트 언마운트 시 URL.revokeObjectURL()로 메모리 해제가 권장되나 현재 미구현.
     */
    const [previewUrl, setPreviewUrl] = useState(null);

    /**
     * fileInputRef: 숨겨진(hidden) <input type="file"> DOM 요소에 대한 ref.
     * 커스텀 UI(이미지 클릭 영역, 버튼)에서 ref.current.click()을 호출하여
     * 브라우저 파일 선택 다이얼로그를 여는 데 사용.
     */
    const fileInputRef = useRef(null);

    /**
     * formData: 수정할 프로필 필드값.
     * - username:   사용자명 (이름)
     * - visibility: 계정 공개 여부 ('PUBLIC' | 'PRIVATE')
     * 초기값은 loadUser() 성공 후 API 응답 기반으로 setFormData로 업데이트됨.
     */
    const [formData, setFormData] = useState({
        username: '',
        visibility: 'PUBLIC'
    });

    // -------------------------------------------------------------------------
    // [useEffect: 초기 프로필 로드]
    // -------------------------------------------------------------------------

    /**
     * 마운트 시(또는 authUser 변경 시) 현재 프로필 정보를 서버에서 로드.
     *
     * API 호출: userService.getMyProfile() → GET /api/users/me
     *
     * 성공 시:
     *   - setUser(data): 전체 프로필 데이터 저장
     *   - setFormData({ username, visibility }): 폼 초기값으로 현재 값 설정
     *
     * 실패 시 (폴백 처리):
     *   - console.warn으로 경고 출력
     *   - authUser 기반으로 fallbackUser 구성하여 user 상태로 설정
     *   - formData도 fallbackUser 기준으로 초기화
     *   - 폴백 profileImage: authUser.profileImageUrl → 'https://picsum.photos/...' 순 폴백
     *
     * finally: setIsLoading(false) → 스피너 종료, 폼 화면 렌더링
     *
     * 의존성 배열: [authUser] - authUser가 변경될 때 재실행
     */
    useEffect(() => {
        const loadUser = async () => {
            // TODO: [1] setIsLoading(true) 호출
            // TODO: [2] userService.getMyProfile() 호출하여 현재 프로필 데이터 로드
            // TODO: [3] 성공 시 setUser(data), setFormData({ username, visibility }) 설정
            // TODO: [4] 실패 시 authUser 기반으로 fallbackUser 구성하여 setUser(), setFormData() 설정
            //           fallbackUser.profileImage: authUser?.profileImageUrl 또는 기본 picsum 이미지
            // 힌트: finally 블록에서 setIsLoading(false) 호출

            setIsLoading(true);
            try {
                const data = await userService.getMyProfile();
                console.log('[profile] 불러오기:', data);
                setUser(data);
                setFormData({ username: data.username, visibility: data.visibility });
            } catch (error) {
                console.warn('[profile] 불러오기 실패, fallback 사용:', error);
                const fallbackUser = {
                    ...authUser,
                    profileImage: authUser?.profileImageUrl || DEFAULT_AVATAR // ?. null이나 undefined면 undefined 반환
                };
                setUser(fallbackUser);
                setFormData({ username: fallbackUser.username, visibility: fallbackUser.visibility });
            } finally {
                setIsLoading(false);
            }
        };
        loadUser();
    }, [authUser]);

    // -------------------------------------------------------------------------
    // [핸들러 함수]
    // -------------------------------------------------------------------------

    /**
     * handleFileChange: 파일 선택 다이얼로그에서 파일이 선택됐을 때 호출.
     *
     * @param {React.ChangeEvent<HTMLInputElement>} e - input[type=file] change 이벤트
     *
     * 동작:
     *   1. e.target.files[0]으로 선택된 첫 번째 파일 취득.
     *   2. 파일이 없으면(취소 등) 즉시 반환.
     *   3. setProfileFile(file): File 객체 저장 → handleSubmit에서 multipart 업로드에 사용.
     *   4. URL.createObjectURL(file)로 Blob URL 생성 → setPreviewUrl로 미리보기 반영.
     *      - 이 시점에 서버 업로드는 발생하지 않음. UI 미리보기만 즉시 갱신됨.
     */
    const handleFileChange = (e) => {
        // TODO: [1] e.target.files?.[0]으로 선택된 파일 취득
        // TODO: [2] 파일이 없으면 즉시 return
        // TODO: [3] setProfileFile(file): File 객체 저장
        // TODO: [4] URL.createObjectURL(file)로 Blob URL 생성 → setPreviewUrl()로 미리보기 반영
        // 힌트: 이 시점에 서버 업로드는 발생하지 않음. UI 미리보기만 즉시 갱신됨.

        //서버에 파일을 올리지는 않고 미리보기만 보여줌
        const file = e.target.files?.[0];
        if (!file) return;
        console.log('[profileImage] 선택:', file.name);
        setProfileFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    /**
     * handleSubmit: "완료" 버튼 클릭 또는 form submit 시 호출되는 저장 핸들러.
     *
     * @param {Event} e - 이벤트 객체 (form submit 또는 button click)
     *
     * 동작 (2단계 순차 처리):
     *
     * [Step 1] 새 프로필 이미지 업로드 (profileFile이 있을 때만)
     *   - FormData 객체 생성 후 'file' 키에 profileFile 추가
     *   - userService.uploadProfileImage(formDataImg) 호출 → POST /api/users/me/profile-image
     *     Content-Type: multipart/form-data (브라우저가 자동 설정)
     *   - 응답에서 result.profileImageUrl 취득 → updateUser()로 AuthContext 메모리 즉시 반영
     *     (다른 페이지에서 새 이미지를 즉시 사용할 수 있도록)
     *
     * [Step 2] 사용자명 / 공개 여부 업데이트
     *   - userService.updateProfile({ username, visibility }) → PUT /api/users/me
     *   - 성공 후 updateUser({ username, visibility })로 AuthContext 메모리 동기화
     *
     * 완료 후:
     *   - alert('프로필이 성공적으로 수정되었습니다.')
     *   - navigate('/profile'): 프로필 페이지로 이동
     *
     * 실패 시:
     *   - console.error로 에러 출력
     *   - alert(에러 메시지 또는 기본 메시지)
     *
     * isSaving:
     *   - 함수 시작 시 true → 완료 버튼 비활성화
     *   - finally에서 false → 버튼 재활성화
     */
    const handleSubmit = async (e) => {
        // TODO: [1] e.preventDefault() 호출
        // TODO: [2] setIsSaving(true) 호출 (완료 버튼 비활성화)
        // TODO: [Step 1] profileFile이 있으면:
        //               new FormData() 생성 후 'file' 키로 profileFile 추가
        //               userService.uploadProfileImage(formDataImg) 호출
        //               응답의 result?.profileImageUrl이 있으면 updateUser()로 AuthContext 반영
        // TODO: [Step 2] userService.updateProfile({ username: formData.username, visibility: formData.visibility }) 호출
        //               성공 후 updateUser({ username, visibility })로 AuthContext 동기화
        // TODO: [3] 성공 시 alert('프로필이 성공적으로 수정되었습니다.') → navigate('/profile')
        // TODO: [4] 실패 시 console.error + alert(에러 메시지 또는 기본 메시지)
        // 힌트: finally 블록에서 setIsSaving(false) 호출
        e.preventDefault();
        setIsSaving(true);
        try {
            // Step 1: 이미지 업로드 (실패해도 계속 진행)
            if (profileFile) {
                try {
                    const formDataImg = new FormData();
                    formDataImg.append('file', profileFile);
                    if (authUser?.id || authUser?.userId) {
                        formDataImg.append('userId', String(authUser?.id || authUser?.userId));
                    }
                    const data = await userService.uploadProfileImage(formDataImg);
                    console.log('[profileImage] 업로드 응답:', data);
                    const newImageUrl = data?.result?.profileImageUrl
                                    || data?.profileImageUrl
                                    || data?.result;
                    if (newImageUrl) {
                        updateUser({ profileImageUrl: newImageUrl });
                    }
                } catch (imgError) {
                    console.warn('이미지 업로드 실패:', imgError);
                    showAlert('프로필 사진 변경에 실패했습니다. 나머지 정보는 저장됩니다.');
                }
            }

            // Step 2: 닉네임/공개여부 업데이트
            await userService.updateProfile({
                username: formData.username,
                visibility: formData.visibility
            });
            console.log('[profile] 수정 성공');
            updateUser({ username: formData.username, visibility: formData.visibility });
            showAlert('프로필이 수정되었습니다.', '프로필', 'success');
            setTimeout(() => navigate('/profile'), 1000);
        } catch (error) {
            console.error(error);
            showAlert(error.message || '프로필 수정에 실패했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    // -------------------------------------------------------------------------
    // [파생 변수]
    // -------------------------------------------------------------------------

    /**
     * currentImage: 현재 화면에 표시할 프로필 이미지 URL.
     * 우선순위: previewUrl (새로 선택한 이미지) → user.profileImageUrl → user.profileImage → 기본 이미지
     * previewUrl은 파일 선택 즉시 생성되는 Blob URL로, 서버 응답 없이 미리보기를 제공.
     */
    const currentImage = previewUrl || user?.profileImageUrl || user?.profileImage || DEFAULT_AVATAR;

    // -------------------------------------------------------------------------
    // [조기 반환: 로딩 상태]
    // -------------------------------------------------------------------------

    // isLoading=true 또는 user=null인 경우: 전체 화면 스피너 표시
    if (isLoading || !user) {
        console.log('[profile] 로딩 중 - isLoading:', isLoading, '/ user:', user);
        return (
            <ResponsiveLayout showTabs={false}>
                <div className="flex flex-col items-center justify-center min-h-[calc(100vh-60px)] gap-4">
                    <Loader2 className="animate-spin text-gray-400" size={40} />
                    <div className="text-[13px] uppercase font-black italic tracking-widest text-[#ccd3db] animate-pulse">Loading SNAP...</div>
                </div>
            </ResponsiveLayout>
        );
    }

    // -------------------------------------------------------------------------
    // [JSX 렌더링]
    // -------------------------------------------------------------------------

    return (
        <ResponsiveLayout showTabs={false}>
            {/* 전체 페이지 컨테이너: 라이트/다크 모드 */}
            <div className="flex flex-col min-h-screen bg-white dark:bg-[#101215] text-black dark:text-[#e5e5e5]">

                {/* ============================================================
                    [섹션 1] 상단 헤더 (sticky)
                    - 좌: ArrowLeft 버튼 → navigate(-1) (이전 페이지로)
                    - 중: "EDIT PROFILE" 제목
                    - 우: "완료" / "저장 중..." 버튼 → handleSubmit 호출
                          isSaving=true일 때 disabled + 텍스트 변경
                ============================================================ */}
                <div className="flex items-center justify-between h-14 px-4 border-b border-[#e5e5e5] dark:border-[#292e35] sticky top-0 bg-white dark:bg-[#1c1f24] z-10">
                    <button onClick={() => navigate(-1)} className="p-2 text-black hover:bg-gray-50 rounded-full transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="font-black italic text-[16px] tracking-widest uppercase">EDIT PROFILE</h1>
                    {/* 완료 버튼: isSaving=true이면 disabled 처리하여 중복 제출 방지 */}
                    <button
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className="px-4 py-1.5 bg-black text-white rounded-full font-bold text-[13px] disabled:opacity-50 hover:bg-gray-800 transition-colors"
                    >
                        {isSaving ? '저장 중...' : '완료'}
                    </button>
                </div>

                <div className="p-6">
                    {/* ============================================================
                        [섹션 2] 프로필 이미지 영역
                        - 숨겨진 <input type="file">: fileInputRef로 참조
                          accept="image/jpeg,image/png,image/webp" (지원 형식 제한)
                          onChange → handleFileChange
                        - 이미지 클릭 영역 (group):
                          hover 시 반투명 검정 오버레이 + Camera 아이콘 표시
                          클릭 시 fileInputRef.current.click() → 파일 선택 다이얼로그
                        - 표시 이미지: currentImage (previewUrl 우선)
                        - "프로필 사진 변경" / "사진 변경됨 ✓" 버튼:
                          파일이 선택되면 텍스트가 변경(사용자에게 선택됨 피드백)
                          클릭 시 동일하게 파일 선택 다이얼로그 열기
                    ============================================================ */}
                    <div className="flex flex-col items-center mb-10">
                        {/* 숨겨진 파일 입력 */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={handleFileChange}
                        />

                        {/* 프로필 이미지 클릭 시 파일 선택 */}
                        <div
                            className="relative group cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <img
                                src={currentImage}
                                alt="profile"
                                className="w-24 h-24 rounded-[28px] object-cover border-2 border-[#f3f3f3] shadow-sm"
                                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                            />
                            {/* hover 오버레이: opacity-0 → group-hover:opacity-100 트랜지션 */}
                            <div className="absolute inset-0 bg-black/40 rounded-[28px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera size={24} className="text-white" />
                            </div>
                        </div>

                        {/* 파일 선택 버튼: 파일 선택 후 텍스트 변경으로 선택 완료 피드백 */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-3 text-[12px] font-bold uppercase tracking-widest bg-gray-100 dark:bg-[#292e35] dark:text-[#e5e5e5] px-4 py-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-[#424a54] transition-colors"
                        >
                            {profileFile ? '사진 변경됨 ✓' : '프로필 사진 변경'}
                        </button>
                    </div>

                    {/* ============================================================
                        [섹션 3] 폼 영역
                        - 이름(username) 텍스트 입력:
                            value: formData.username
                            onChange: formData 스프레드 후 username만 업데이트
                        - 계정 공개 여부 셀렉트:
                            value: formData.visibility ('PUBLIC' | 'PRIVATE')
                            onChange: formData 스프레드 후 visibility만 업데이트
                            PUBLIC: 모든 사용자가 게시글을 볼 수 있음
                            PRIVATE: 허락받은 사람만 게시글을 볼 수 있음
                        - 폼은 onSubmit 없이 선언됨; 제출은 헤더의 "완료" 버튼이 담당
                    ============================================================ */}
                    <form className="flex flex-col gap-6">
                        {/* 이름 입력 필드 */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-bold text-gray-500 dark:text-[#a3b0c1] ml-1">이름</label>
                            <input
                                type="text"
                                className="w-full h-12 px-4 border border-[#e5e5e5] dark:border-[#292e35] bg-white dark:bg-[#1c1f24] text-black dark:text-[#e5e5e5] rounded-[4px] text-[14px] focus:outline-none focus:border-black dark:focus:border-[#e5e5e5] transition-colors"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            />
                        </div>

                        {/* 계정 공개 여부 셀렉트 */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-bold text-gray-500 dark:text-[#a3b0c1] ml-1">계정 공개 여부</label>
                            <select
                                className="w-full h-12 px-4 border border-[#e5e5e5] dark:border-[#292e35] rounded-[4px] text-[14px] focus:outline-none focus:border-black dark:focus:border-[#e5e5e5] transition-colors bg-white dark:bg-[#1c1f24] dark:text-[#e5e5e5]"
                                value={formData.visibility}
                                onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                            >
                                <option value="PUBLIC">공개</option>
                                <option value="PRIVATE">비공개</option>
                            </select>
                            {/* 비공개 설명 안내 문구 */}
                            <p className="text-[11px] text-[#a3b0c1] mt-1 ml-1 leading-relaxed">
                                비공개 계정이 되면 회원님의 허락 없이 다른 사람이 회원님의 사진이나 동영상을 볼 수 없습니다.
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </ResponsiveLayout>
    );
}
