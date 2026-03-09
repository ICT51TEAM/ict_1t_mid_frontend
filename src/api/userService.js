/**
 * @file userService.js
 * @description 사용자 프로필 조회/수정, 설정 관리, 비밀번호 변경, 회원 탈퇴 API를 담당하는 서비스 파일
 *
 * ─────────────────────────────────────────────────────────
 * 이 파일의 역할:
 *   현재 로그인한 사용자 본인의 프로필 및 설정 관련 API와
 *   다른 사용자의 프로필 조회 API를 제공한다.
 *   인증이 필요한 모든 작업에는 apiClient가 자동으로 JWT를 주입한다.
 *
 * ─────────────────────────────────────────────────────────
 * [호출되는 백엔드 엔드포인트 목록]
 *   GET    /api/users/me                    → 내 프로필 조회
 *   GET    /api/users/{userId}              → 타인 프로필 조회
 *   PUT    /api/users/me                    → 내 프로필 수정 (닉네임, 소개, 공개 범위)
 *   POST   /api/users/me/profile-image      → 프로필 이미지 업로드 (multipart)
 *   PUT    /api/users/me/password           → 비밀번호 변경
 *   DELETE /api/users/me                    → 회원 탈퇴
 *   GET    /api/users/me/settings           → 설정 조회
 *   PUT    /api/users/me/settings           → 설정 업데이트
 *
 * ─────────────────────────────────────────────────────────
 * [프로필 응답 데이터 형태]
 *   getMyProfile() / getUserProfile() 응답 (UserProfileResponse):
 *   {
 *     userId          : number,   // 사용자 ID
 *     email           : string,   // 이메일 주소
 *     username        : string,   // 닉네임
 *     bio             : string,   // 자기소개
 *     profileImageUrl : string,   // 프로필 이미지 URL (없으면 null)
 *     visibility      : string,   // 계정 공개 범위 ('PUBLIC' | 'FRIENDS' | 'PRIVATE')
 *     totalBadges     : number,   // 총 달개 수
 *     level           : number,   // 레벨 (백엔드가 제공하거나 프론트에서 계산)
 *     albumCount      : number,   // 작성한 앨범 수
 *     friendCount     : number    // 친구 수
 *   }
 *
 * ─────────────────────────────────────────────────────────
 * [레벨 계산 로직 (getMyProfile)]
 *   백엔드가 level 필드를 제공하지 않을 수 있으므로,
 *   프론트엔드에서 totalBadges 기반으로 레벨을 계산하여 보완한다.
 *   공식: level = Math.floor(totalBadges / 5) + 1
 *   백엔드 level이 있으면 백엔드 값 우선, 없으면 계산 값 사용:
 *     level: data.level || calculatedLevel
 *
 * ─────────────────────────────────────────────────────────
 * [요청 데이터 형태]
 *   updateProfile() 요청 body:
 *   {
 *     username   : string,   // 변경할 닉네임 (선택)
 *     bio        : string,   // 변경할 자기소개 (선택)
 *     visibility : string    // 변경할 공개 범위 (선택) 'PUBLIC' | 'FRIENDS' | 'PRIVATE'
 *   }
 *
 *   uploadProfileImage() 요청:
 *   multipart/form-data (FormData 객체) → 호출하는 컴포넌트에서 직접 FormData를 구성하여 전달
 *
 *   changePassword() 요청 body:
 *   {
 *     currentPassword : string,   // 현재 비밀번호 (검증용)
 *     newPassword     : string    // 새 비밀번호
 *   }
 *
 *   deleteAccount() 요청 body:
 *   { password: string }   또는   { currentPassword: string }
 *   (탈퇴 전 본인 확인용 비밀번호 - DELETE 요청의 body로 전달)
 *
 *   updateSettings() 요청 body (SettingsDto):
 *   {
 *     pushNotificationEnabled : boolean,   // 푸시 알림 활성화 여부
 *     emailNotificationEnabled: boolean,   // 이메일 알림 활성화 여부
 *     language                : string,    // 언어 설정 ('ko' | 'en' 등)
 *     theme                   : string     // 테마 ('light' | 'dark' | 'system')
 *   }
 *
 * ─────────────────────────────────────────────────────────
 * [에러 처리 전략]
 *   getMyProfile():
 *     try-catch를 사용하지만 에러를 re-throw한다.
 *     → 프로필 로드 실패는 사용자에게 알려야 하는 중요한 오류이므로
 *       UI 컴포넌트(ProfilePage 등)의 catch 블록에서 처리하게 한다.
 *
 *   나머지 함수들:
 *     try-catch 없이 에러를 호출부로 전파한다.
 *     각 컴포넌트에서 try-catch로 처리해야 한다.
 *
 *   주요 실패 케이스:
 *   - updateProfile, changePassword: 400 (유효성 오류), 401 (미인증)
 *   - deleteAccount: 401 (비밀번호 틀림)
 *   - uploadProfileImage: 413 (파일 크기 초과), 415 (지원하지 않는 형식)
 *
 * ─────────────────────────────────────────────────────────
 * [관련 파일]
 *   - src/api/apiClient.js                      : axios 인스턴스
 *   - src/context/AuthContext.jsx               : getMyProfile() 사용 (로그인 후 사용자 정보 로드)
 *   - src/pages/profile/ProfilePage.jsx         : getMyProfile(), updateProfile() 사용
 *   - src/pages/friends/FriendProfilePage.jsx   : getUserProfile() 사용
 *   - src/pages/settings/SettingsPage.jsx       : getSettings(), updateSettings() 사용
 *   - src/pages/settings/ChangePasswordPage.jsx : changePassword() 사용
 *   - src/pages/settings/DeleteAccountPage.jsx  : deleteAccount() 사용
 */
import apiClient from './apiClient';

/**
 * userService 객체
 *
 * 사용자 프로필 및 설정 관련 모든 API를 묶어 named export한다.
 * 사용: import { userService } from './userService';
 */
export const userService = {

    /* ═══ 실제 API 호출 (백엔드 연결 모드) ═══ */

    /**
     * [1] 내 프로필 조회
     *
     * 현재 로그인한 사용자의 프로필 정보를 가져온다.
     * 백엔드가 level 필드를 제공하지 않는 경우를 대비하여
     * totalBadges를 기반으로 레벨을 프론트엔드에서 계산한다.
     *
     * 레벨 결정 우선순위:
     *   1. 백엔드 응답의 level 필드가 있으면 그 값 사용
     *   2. 없으면 Math.floor(totalBadges / 5) + 1 로 계산
     *
     * @returns {Promise<Object>} 사용자 프로필 데이터 (레벨 보완됨)
     *   {
     *     userId          : number,
     *     email           : string,
     *     username        : string,
     *     bio             : string,
     *     profileImageUrl : string | null,
     *     visibility      : string,
     *     totalBadges     : number,
     *     level           : number,    // 백엔드 값 또는 계산 값
     *     albumCount      : number,
     *     friendCount     : number,
     *     ...백엔드 기타 필드
     *   }
     *
     * 에러 시: console.error 출력 후 Error re-throw (UI 컴포넌트가 처리)
     *
     * HTTP: GET /api/users/me
     * 인증 필요: 예
     * 성공: 200 OK
     * 실패: 401 Unauthorized → apiClient 인터셉터가 로그인 페이지로 리다이렉트
     */
    getMyProfile: async () => {
        // TODO: GET /users/me 를 호출하고, totalBadges 기반 레벨을 계산하여 반환하세요.
        // 힌트: try { apiClient.get('/users/me') → data 추출 → calculatedLevel = Math.floor((data.totalBadges||0)/5)+1
        //        → return { ...data, level: data.level || calculatedLevel } }
        //       catch(error) { console.error(...); throw error; }
        try {
            const response = await apiClient.get('/users/me');
            const data = response.data;
            const calculatedLevel = Math.floor((data.totalBadges || 0) / 5) + 1; // ?. 쓸수없다. undefined를 채우고자 하는게 아니니까
            return { ...data, level: calculatedLevel }; // 언제나 계산
        } catch (error) {
            console.error('Error fetching my profile:', error);
            throw error;
        }
    },

    /**
     * [2] 타인 프로필 조회
     *
     * 친구 목록이나 검색 결과에서 특정 사용자의 프로필을 조회한다.
     * 공개 범위(visibility)에 따라 일부 정보가 제한될 수 있다.
     * getMyProfile()과 달리 레벨 계산 없이 응답을 그대로 반환한다.
     *
     * @param {number|string} userId - 조회할 대상 사용자의 ID
     *
     * @returns {Promise<Object>} 대상 사용자의 프로필 데이터
     *   {
     *     userId          : number,
     *     username        : string,
     *     bio             : string,
     *     profileImageUrl : string | null,
     *     visibility      : string,
     *     totalBadges     : number,
     *     level           : number,
     *     albumCount      : number,
     *     friendCount     : number,
     *     isFriend        : boolean   // 현재 로그인 사용자와 친구인지 여부
     *   }
     *
     * HTTP: GET /api/users/{userId}
     * 인증 필요: 예
     * 성공: 200 OK
     * 실패: 404 Not Found (사용자 없음), 403 Forbidden (PRIVATE 계정)
     */

    getUserProfile: async (userId) => {
        const response = await apiClient.get(`/users/${userId}`);
        return response.data;
    },


    /**
     * [3] 내 프로필 수정
     *
     * 닉네임, 자기소개, 계정 공개 범위 등 프로필 정보를 수정한다.
     * 변경하지 않을 필드는 포함하지 않거나 기존 값을 그대로 전달한다.
     *
     * @param {Object} profileData              - 수정할 프로필 데이터 객체
     * @param {string} profileData.username     - 변경할 닉네임 (선택)
     * @param {string} profileData.bio          - 변경할 자기소개 (선택)
     * @param {string} profileData.visibility   - 변경할 공개 범위 (선택)
     *                                            'PUBLIC' | 'FRIENDS' | 'PRIVATE'
     *
     * @returns {Promise<Object>} 수정된 프로필 데이터
     *   예: { userId, username, bio, visibility, ... }
     *
     * HTTP: PUT /api/users/me
     * 요청 body: { username: string, bio: string, visibility: string }
     * Content-Type: application/json
     * 인증 필요: 예
     * 성공: 200 OK
     * 실패: 400 (유효성 오류, 중복 닉네임 등), 401 Unauthorized
     */
    updateProfile: async (profileData) => {
        // TODO: PUT /users/me 를 호출하고 response.data를 반환하세요.
        // 힌트: apiClient.put('/users/me', profileData) → response.data
        const response = await apiClient.put('/users/me', profileData);
        return response.data;
    },

    /**
     * [4] 프로필 이미지 업로드
     *
     * 사용자의 프로필 이미지를 새로운 이미지로 교체한다.
     * multipart/form-data 형식으로 이미지 파일을 업로드하며,
     * FormData 객체는 호출하는 컴포넌트에서 직접 구성하여 전달한다.
     *
     * FormData 구성 예시 (컴포넌트에서):
     *   const formData = new FormData();
     *   formData.append('image', imageFile);
     *   await userService.uploadProfileImage(formData);
     *
     * @param {FormData} formData - 프로필 이미지를 담은 FormData 객체
     *   'image' 키로 File 객체를 append해야 함 (백엔드 요구사항 확인 필요)
     *
     * @returns {Promise<Object>} 업로드 결과
     *   예: { profileImageUrl: "https://s3.amazonaws.com/.../profile.jpg" }
     *   → 반환된 URL로 프로필 이미지 src를 업데이트해야 함
     *
     * HTTP: POST /api/users/me/profile-image
     * Content-Type: multipart/form-data (FormData 자동 처리)
     * 인증 필요: 예
     * 성공: 200 OK
     * 실패: 400 (파일 없음), 413 (파일 크기 초과), 415 (지원 안 하는 형식)
     */
    uploadProfileImage: async (formData) => {
        // TODO: POST /users/me/profile-image 를 호출하고 response.data를 반환하세요.
        // 힌트: Content-Type을 'multipart/form-data'로 오버라이드해야 합니다.
        //       apiClient.post('/users/me/profile-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } }) → response.data
        const response = await apiClient.post('/users/me/profile-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        return response.data; //파일 업로드는 application/json(기본값)이 아니라 multipart/form-data
    },

    /**
     * [5] 비밀번호 변경
     *
     * 현재 비밀번호를 확인한 후 새 비밀번호로 변경한다.
     * 현재 비밀번호가 일치하지 않으면 백엔드에서 401 또는 400 에러를 반환한다.
     *
     * @param {Object} passwordData                  - 비밀번호 변경 데이터
     * @param {string} passwordData.currentPassword  - 현재(기존) 비밀번호 (본인 확인용)
     * @param {string} passwordData.newPassword      - 새로 설정할 비밀번호
     *
     * @returns {Promise<Object>} 변경 결과
     *   예: { message: "비밀번호가 변경되었습니다." }
     *
     * HTTP: PUT /api/users/me/password
     * 요청 body: { currentPassword: string, newPassword: string }
     * Content-Type: application/json
     * 인증 필요: 예
     * 성공: 200 OK
     * 실패: 400/401 (현재 비밀번호 불일치), 400 (새 비밀번호 유효성 오류)
     */
    changePassword: async (passwordData) => {
        // TODO: PUT /users/me/password 를 호출하고 response.data를 반환하세요.
        // 힌트: apiClient.put('/users/me/password', passwordData) → response.data
        const response = await apiClient.put('/users/me/password', passwordData);
        return response.data;
    },

    /**
     * [6] 회원 탈퇴
     *
     * 현재 계정과 관련된 모든 데이터를 영구적으로 삭제한다.
     * 본인 확인을 위해 비밀번호를 요청 body에 포함시킨다.
     * DELETE 메서드에 body를 포함시키기 위해 axios의 { data: passwordData } 옵션을 사용한다.
     *
     * 주의: 탈퇴 후에는 계정을 복구할 수 없다.
     *       UI에서 확인 모달을 띄운 후 사용자가 동의했을 때만 호출해야 한다.
     *
     * @param {Object} passwordData           - 본인 확인용 비밀번호 데이터
     * @param {string} passwordData.password  - 현재 비밀번호 (또는 currentPassword 키 사용)
     *
     * @returns {Promise<Object>} 탈퇴 처리 결과
     *   예: { message: "회원 탈퇴가 완료되었습니다." }
     *   → 탈퇴 후 localStorage의 authToken을 제거하고 로그인 페이지로 이동해야 함
     *
     * HTTP: DELETE /api/users/me
     * 요청 body: { password: string } (axios { data: ... } 옵션으로 전달)
     * 인증 필요: 예
     * 성공: 200 OK 또는 204 No Content
     * 실패: 401 (비밀번호 불일치)
     */
    deleteAccount: async (passwordData) => {
        // TODO: DELETE /users/me 를 호출하고 response.data를 반환하세요.
        // 힌트: DELETE에 body를 포함하려면 axios config의 data 옵션을 사용합니다.
        //       apiClient.delete('/users/me', { data: passwordData }) → response.data
    },

    /**
     * [7] 설정 조회
     *
     * 현재 사용자의 앱 설정 정보를 가져온다.
     * 알림 설정, 언어, 테마 등의 개인화 설정이 포함된다.
     *
     * @returns {Promise<Object>} 설정 데이터 (UserSettingsDto)
     *   {
     *     pushNotificationEnabled  : boolean,   // 푸시 알림 활성화 여부
     *     emailNotificationEnabled : boolean,   // 이메일 알림 활성화 여부
     *     language                 : string,    // 언어 설정 ('ko' | 'en' 등)
     *     theme                    : string     // 테마 ('light' | 'dark' | 'system')
     *   }
     *
     * HTTP: GET /api/users/me/settings
     * 인증 필요: 예
     * 성공: 200 OK
     */
    getSettings: async () => {
        // TODO: GET /users/me/settings 를 호출하고 response.data를 반환하세요.
        // 힌트: apiClient.get('/users/me/settings') → response.data
        const response = await apiClient.get('/users/me/settings');
        return response.data;
    },

    /**
     * [8] 설정 업데이트
     *
     * 사용자의 앱 설정을 변경한다.
     * 변경하지 않을 설정 항목도 현재 값을 포함하여 전달하는 것을 권장한다
     * (서버 측 구현에 따라 partial update 또는 full replace 방식이 다를 수 있음).
     *
     * @param {Object}  settings                           - 변경할 설정 데이터 객체
     * @param {boolean} settings.pushNotificationEnabled  - 푸시 알림 활성화 여부 (선택)
     * @param {boolean} settings.emailNotificationEnabled - 이메일 알림 활성화 여부 (선택)
     * @param {string}  settings.language                 - 언어 설정 (선택)
     * @param {string}  settings.theme                    - 테마 설정 (선택)
     *
     * @returns {Promise<Object>} 업데이트된 설정 데이터
     *   (요청 body와 동일한 형태로 반환)
     *
     * HTTP: PUT /api/users/me/settings
     * 요청 body: { pushNotificationEnabled, emailNotificationEnabled, language, theme }
     * Content-Type: application/json
     * 인증 필요: 예
     * 성공: 200 OK
     * 실패: 400 Bad Request (유효하지 않은 설정 값)
     */
    updateSettings: async (settings) => {
        // TODO: PUT /users/me/settings 를 호출하고 response.data를 반환하세요.
        // 힌트: apiClient.put('/users/me/settings', settings) → response.data
        const response = await apiClient.put('/users/me/settings', settings);
        return response.data;
    }
};
