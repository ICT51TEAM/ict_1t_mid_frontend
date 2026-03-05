/**
 * @file EditPostPage.jsx
 * @route /snap/:id/edit
 *
 * @description
 * 기존 스냅 게시물을 수정하는 페이지.
 * URL 파라미터 :id 로 대상 게시물을 식별한다.
 * 마운트 시 기존 게시물 데이터를 로드하여 폼에 미리 채워주고,
 * 사용자가 제목/내용/태그를 수정한 뒤 "UPDATE SNAP" 버튼으로 저장한다.
 *
 * @important
 * handleUpdate 함수 내의 postService.updatePost 는 현재 백엔드 미구현으로
 * 호출 시 에러가 발생한다. "수정에 실패했습니다." alert 가 표시된다.
 *
 * @layout
 * ┌─────────────────────────────────────────┐
 * │  [Header]                               │
 * │    ← 뒤로가기    EDIT SNAP              │
 * ├─────────────────────────────────────────┤
 * │  [제목 입력] (대형 이탤릭, 하단 테두리) │
 * │  [내용 입력] (textarea, min-h-300px)    │
 * ├─────────────────────────────────────────┤
 * │  [태그 입력] + 추가 버튼                │
 * │  [태그 칩 목록]                         │
 * ├─────────────────────────────────────────┤
 * │  [UPDATE SNAP 버튼]                     │
 * └─────────────────────────────────────────┘
 *
 * @urlParams
 *   id {string} - URL 파라미터. 수정할 게시물의 ID.
 *                 useEffect 와 handleUpdate 에서 사용됨.
 *
 * @state
 *   title        - 제목 입력값. postService.getPost 응답의 title 로 초기화됨.
 *   content      - 내용 입력값. 응답의 content 또는 preview 로 초기화됨.
 *   tags         - 태그 배열. 응답의 tags 배열로 초기화됨.
 *   tagInput     - 태그 입력창 임시 값.
 *   isSubmitting - handleUpdate API 호출 중 여부. true 이면 Loader2 스피너 표시.
 *   isLoading    - 게시물 로드(useEffect) 중 여부. true 이면 전체 로딩 화면 표시.
 *
 * @api
 *   [로드] postService.getPost(id)   → GET /api/albums/{id}
 *          성공: title, content, tags 상태 초기화
 *          실패: alert + navigate(-1)
 *
 *   [수정] postService.updatePost(id, { title, content, tags })
 *          → 백엔드 미구현 → 현재 항상 실패
 *          성공(구현 후): alert('수정되었습니다.') + navigate('/snap/{id}')
 *          실패: alert('수정에 실패했습니다.')
 *
 * @note
 *   - 사진 편집 기능 없음 (제목/내용/태그만 수정 가능)
 *   - 공개범위/날짜/레이아웃 변경 UI 없음
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { ArrowLeft, X, Loader2 } from 'lucide-react';
import { postService } from '@/api/postService';

export default function EditPostPage() {
    // URL에서 수정할 게시물 ID 추출 (/snap/:id/edit)
    const { id } = useParams();
    const navigate = useNavigate();

    /**
     * @state title
     * 수정할 제목 입력값.
     * useEffect 에서 postService.getPost(id) 응답의 post.title 로 초기화됨.
     * 빈 문자열이면 handleUpdate 에서 API 를 호출하지 않음.
     * (현재 handleUpdate 는 content 만 검사하지만 title 도 함께 전송됨)
     */
    const [title, setTitle] = useState('');

    /**
     * @state content
     * 수정할 내용 입력값 (본문).
     * useEffect 에서 post.content 또는 post.preview 로 초기화됨.
     * UPDATE SNAP 버튼은 content.trim() 이 비어있으면 disabled.
     */
    const [content, setContent] = useState('');

    /**
     * @state tags
     * 수정할 태그 배열.
     * useEffect 에서 post.tags 배열로 초기화됨.
     * handleAddTag 로 추가, X 버튼으로 제거됨.
     */
    const [tags, setTags] = useState([]);

    /**
     * @state tagInput
     * 태그 입력창의 임시 값.
     * 엔터 키 또는 "추가" 버튼으로 handleAddTag 호출 후 '' 로 초기화됨.
     */
    const [tagInput, setTagInput] = useState('');

    /**
     * @state isSubmitting
     * handleUpdate 의 API 호출 중 여부.
     * true 이면 UPDATE SNAP 버튼 disabled + Loader2 스피너 표시.
     * finally 에서 항상 false 로 전환됨.
     */
    const [isSubmitting, setIsSubmitting] = useState(false);

    /**
     * @state isLoading
     * 마운트 시 게시물 데이터 로드(useEffect) 중 여부.
     * true 이면 전체 페이지 대신 "Loading..." 화면 표시.
     * useEffect 의 finally 에서 false 로 전환됨.
     */
    const [isLoading, setIsLoading] = useState(true);

    /**
     * @useEffect 기존 게시물 데이터 로드
     * @trigger 컴포넌트 마운트 시 또는 id/navigate 변경 시 (deps: [id, navigate])
     *
     * 동작:
     *   1. postService.getPost(id) 호출 → GET /api/albums/{id}
     *   2. 성공:
     *      - setTitle(post.title || '')
     *      - setContent(post.content || post.preview || '')
     *        (content 필드가 없으면 preview 로 fallback)
     *      - setTags(post.tags || [])
     *   3. 실패:
     *      - alert('게시글을 불러오는데 실패했습니다.')
     *      - navigate(-1) → 이전 페이지로 이동
     *   4. finally: setIsLoading(false) → 폼 표시
     */
    useEffect(() => {
        // TODO: postService.getPost(id) 호출 → 성공 시 setTitle/setContent/setTags 초기화
        // TODO: 실패 시 alert('게시글을 불러오는데 실패했습니다.') + navigate(-1)
        // 힌트: async 함수(loadPost) 내부에서 try/catch/finally, finally에서 setIsLoading(false)
    }, [id, navigate]);

    /**
     * @function handleAddTag
     * tagInput 의 값을 tags 배열에 추가한다.
     * 동작:
     *   1. tagInput.trim() 이 비어있으면 무시
     *   2. 이미 tags 에 동일 값이 있으면 무시 (중복 방지)
     *   3. 조건 통과 시 tags 에 추가 + tagInput 을 '' 로 초기화
     *
     * 트리거: 태그 입력창 Enter 키(onKeyDown) 또는 "추가" 버튼 클릭
     */
    const handleAddTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    /**
     * @function handleUpdate
     * UPDATE SNAP 버튼 클릭 시 실행되는 수정 저장 함수.
     *
     * 동작:
     *   1. content.trim() 이 비어있으면 즉시 return (빈 내용 방지)
     *   2. isSubmitting = true 로 전환
     *   3. postService.updatePost(id, { title, content, tags }) 호출
     *      → PATCH 또는 PUT /api/albums/{id} (백엔드 미구현)
     *   4. 성공: alert('수정되었습니다.') + navigate('/snap/{id}')
     *   5. 실패: alert('수정에 실패했습니다.')
     *      ※ 현재 백엔드 미구현으로 항상 실패 처리됨
     *   6. finally: isSubmitting = false
     *
     * @important postService.updatePost 는 현재 백엔드 미구현.
     *            호출 시 에러가 발생하여 항상 "수정에 실패했습니다." alert 표시.
     */
    const handleUpdate = async () => {
        // TODO: [1] content.trim() 비어있으면 return
        // TODO: [2] setIsSubmitting(true)
        // TODO: [3] postService.updatePost(id, { title, content, tags }) 호출
        // TODO: [4] 성공 시 alert('수정되었습니다.') + navigate(`/snap/${id}`)
        // TODO: [5] 실패 시 alert('수정에 실패했습니다.')
        // 힌트: finally에서 setIsSubmitting(false) 호출
    };

    // isLoading === true: 게시물 데이터 로드 중 → 전체 로딩 화면 표시
    if (isLoading) return <ResponsiveLayout showTabs={false}><div className="p-10 text-center">Loading...</div></ResponsiveLayout>;

    return (
        // showTabs={false}: 하단 내비게이션 탭 숨김 (편집 페이지)
        <ResponsiveLayout showTabs={false}>
            <div className="flex flex-col min-h-screen bg-white dark:bg-[#101215] text-black dark:text-[#e5e5e5] p-4">

                {/* ──────────────────────────────────────────────────────
                    Header
                    - 좌측: ArrowLeft 버튼 → navigate(-1)
                    - 가운데: "EDIT SNAP" 제목
                    - 우측: 여백 div (중앙 정렬 유지)
                ────────────────────────────────────────────────────── */}
                <div className="flex items-center justify-between mb-8">
                    <button onClick={() => navigate(-1)}><ArrowLeft size={24} /></button>
                    <h1 className="text-[18px] font-black italic tracking-tighter">EDIT SNAP</h1>
                    <div className="w-10"></div>
                </div>

                <div className="max-w-[600px] mx-auto w-full space-y-8">

                    {/* ──────────────────────────────────────────────────────
                        제목 + 내용 입력 영역
                        [제목]
                        - text input (투명 배경, 하단 테두리만 있음)
                        - 텍스트 크기 2xl, font-black italic
                        - placeholder: "제목을 입력하세요" (회색)
                        - title 상태와 연결

                        [내용]
                        - textarea (투명 배경, 테두리 없음)
                        - min-h-[300px], resize-none
                        - placeholder: "스타일에 대해 다시 이야기해 보세요..."
                        - content 상태와 연결
                    ────────────────────────────────────────────────────── */}
                    <div className="space-y-6">
                        {/* 제목 입력 (대형, 하단 테두리 스타일) */}
                        <input
                            type="text"
                            placeholder="제목을 입력하세요"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full text-2xl font-black italic tracking-tighter placeholder:text-gray-200 bg-transparent outline-none border-b border-[#f3f3f3] dark:border-[#292e35] pb-2"
                        />
                        {/* 내용 입력 (본문 textarea) */}
                        <textarea
                            placeholder="스타일에 대해 다시 이야기해 보세요..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full min-h-[300px] text-[15px] bg-transparent outline-none placeholder:text-gray-300 dark:placeholder:text-[#424a54] resize-none leading-relaxed"
                        />
                    </div>

                    {/* ──────────────────────────────────────────────────────
                        태그 입력 영역
                        - tagInput 상태와 연결된 text input
                        - 엔터 키: handleAddTag 호출
                        - "추가" 버튼: handleAddTag 호출
                        - 태그 칩 목록 (tags 있을 때만 표시):
                          "#{tag}" 텍스트 + X 버튼
                          X 클릭: setTags(tags.filter(tag => tag !== t))
                    ────────────────────────────────────────────────────── */}
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            {/* 태그 입력창 */}
                            <input
                                placeholder="# 태그 입력 후 엔터"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                                className="flex-1 h-12 px-4 bg-[#f3f3f3] dark:bg-[#292e35] text-black dark:text-[#e5e5e5] rounded-[8px] text-[13px] font-bold outline-none"
                            />
                            {/* "추가" 버튼 */}
                            <button onClick={handleAddTag} className="px-6 bg-black text-white rounded-[8px] font-bold text-[13px]">추가</button>
                        </div>
                        {/* 태그 칩 목록 (tags 배열이 있을 때만 표시) */}
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {tags.map(t => (
                                    <span key={t} className="px-3 py-1.5 bg-[#f3f3f3] dark:bg-[#292e35] text-[#7b8b9e] font-bold text-[12px] rounded-full flex items-center gap-1.5">
                                        #{t}
                                        {/* X 버튼: 해당 태그 제거 */}
                                        <X size={12} className="cursor-pointer" onClick={() => setTags(tags.filter(tag => tag !== t))} />
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ──────────────────────────────────────────────────────
                        UPDATE SNAP 버튼 (수정 저장 버튼)
                        - disabled 조건: content.trim() 비어있음 OR isSubmitting === true
                          disabled 시 opacity-20 으로 표시
                        - isSubmitting 중: Loader2 스피너 표시
                        - 대기 중: "UPDATE SNAP" 텍스트 (대문자 이탤릭)
                        - 클릭: handleUpdate() 호출
                        @warning 현재 백엔드 updatePost 미구현 → 항상 실패 alert
                    ────────────────────────────────────────────────────── */}
                    <button
                        onClick={handleUpdate}
                        disabled={!content.trim() || isSubmitting}
                        className="w-full h-16 bg-black text-white rounded-[16px] font-black italic text-[18px] tracking-widest disabled:opacity-20 transition-all flex items-center justify-center gap-3"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" /> : 'UPDATE SNAP'}
                    </button>
                </div>
            </div>
        </ResponsiveLayout>
    );
}
