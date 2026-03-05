/**
 * @file QnaPage.jsx
 * @route /settings/qna
 * @description 서비스 관련 질문을 작성하고 기존 Q&A 목록을 조회하는 게시판 페이지.
 *
 * [화면 구성]
 *   1. 상단 고정 헤더 - 뒤로가기(ArrowLeft) / "Q&A 게시판" 제목 / 작성 토글 버튼(Plus)
 *   2. 로딩 상태: isLoading=true일 때 "Loading..." 텍스트 표시
 *   3. 질문 작성 폼 (isWriting=true일 때만 표시):
 *      - 제목 입력(input)
 *      - 내용 입력(textarea, 높이 128px)
 *      - 취소/POST 버튼
 *   4. Q&A 목록: 각 항목은 접힘/펼침(isExpanded) 토글 카드
 *      - 접힘 상태: 작성자 아이콘 + 작성자명 + 날짜 + 제목 + 펼침 화살표
 *      - 펼침 상태: 위 내용 + 본문 + 답변 섹션(Answers) + 답변 입력 폼
 *   5. 빈 상태: isWriting=false && qnas.length===0 → HelpCircle 아이콘 + 안내 문구
 *
 * [상태 변수]
 *   @state {Array}   qnas       - Q&A 항목 배열. 각 항목 구조:
 *       { id, userId, userName, title, content, date, isExpanded, comments[] }
 *       - id:          서버 응답의 q.id
 *       - userId:      작성자 ID (authorId)
 *       - userName:    작성자 표시명 (authorName → authorId → 'USER', 대문자 변환)
 *       - title:       질문 제목
 *       - content:     질문 본문
 *       - date:        작성 날짜 (ISO → 'YYYY.MM.DD' 형식으로 변환)
 *       - isExpanded:  해당 항목 펼침 여부 (초기값 false)
 *       - comments[]:  답변 목록 (로컬 전용, 서버 미연동)
 *   @state {boolean} isLoading  - API 로드 중 여부 (로딩 텍스트 표시용)
 *   @state {boolean} isWriting  - 질문 작성 폼 표시 여부
 *   @state {string}  newTitle   - 새 질문 제목 입력값
 *   @state {string}  newContent - 새 질문 내용 입력값
 *   @state {object}  commentText - 각 QnA별 답변 입력값 맵
 *       { [qnaId]: string, ... } - 각 Q&A의 id를 키로 하는 입력 텍스트 맵
 *
 * [useEffect: Q&A 목록 로드]
 *   - 마운트 시 1회 실행
 *   - qnaService.getQnas(1, 20) 호출 → GET /api/qna?page=0&size=20&sort=createdAt,desc
 *   - Spring Page 응답 처리: data?.content ?? data ?? [] (Page 객체 또는 배열 모두 처리)
 *   - 응답 항목을 내부 qna 객체 형태로 변환(map):
 *     authorId → userId, authorName → userName(대문자), createdAt → date(YYYY.MM.DD)
 *     isExpanded: false, comments: [] 기본값 추가
 *
 * [핸들러 함수]
 *   toggleExpand(id):
 *     - qnas 배열에서 id가 일치하는 항목의 isExpanded를 반전
 *     - 다른 항목은 그대로 유지
 *
 *   handleCreate():
 *     - 유효성 검사: newTitle 또는 newContent가 비어 있으면 즉시 반환
 *     - qnaService.createQna({ title: newTitle, content: newContent }) 호출
 *       → POST /api/qna { title, content }
 *     - 응답 데이터를 qna 객체로 변환하여 setQnas([newQna, ...qnas]) (목록 맨 앞에 추가)
 *     - 실패 시: alert('질문 등록에 실패했습니다.')
 *     - finally: newTitle/newContent 초기화, isWriting=false
 *
 *   handleAddComment(qnaId):
 *     - commentText[qnaId]가 비어 있으면 즉시 반환
 *     - 백엔드 답변 API 미구현 → 로컬 UI만 업데이트
 *     - 해당 qnaId 항목의 comments 배열에 새 댓글 객체 추가:
 *       { id: Date.now(), userName: 'ME', content: text, date: 'YYYY.MM.DD' }
 *     - setCommentText: 해당 qnaId의 입력값을 '' 로 초기화
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { ArrowLeft, Plus, MessageCircle, ChevronDown, ChevronUp, User, HelpCircle } from 'lucide-react';
import { qnaService } from '@/api/qnaService';

export default function QnaPage() {
    const navigate = useNavigate();

    // -------------------------------------------------------------------------
    // [상태 변수 선언]
    // -------------------------------------------------------------------------

    /**
     * qnas: 화면에 표시할 Q&A 항목 배열.
     * 초기값: [] (빈 배열) → useEffect에서 API 응답으로 채워짐.
     * 각 항목은 서버 응답을 변환한 객체:
     *   { id, userId, userName, title, content, date, isExpanded, comments[] }
     */
    const [qnas, setQnas] = useState([]);

    /**
     * isLoading: Q&A 목록 초기 로드 중 여부.
     * true일 때 → "Loading..." 텍스트 표시.
     * loadQnas() 완료 후 finally에서 false로 설정.
     */
    const [isLoading, setIsLoading] = useState(true);

    /**
     * isWriting: 새 질문 작성 폼 표시 여부.
     * false: 폼 숨김 (기본 상태)
     * true:  폼 표시 (헤더 Plus 버튼 또는 취소 버튼으로 토글)
     * handleCreate() 완료 후 자동으로 false로 복귀.
     */
    const [isWriting, setIsWriting] = useState(false);

    /**
     * newTitle: 새 질문 작성 폼의 제목 입력값.
     * handleCreate() 호출 후 '' 로 초기화.
     */
    const [newTitle, setNewTitle] = useState('');

    /**
     * newContent: 새 질문 작성 폼의 내용 입력값.
     * handleCreate() 호출 후 '' 로 초기화.
     */
    const [newContent, setNewContent] = useState('');

    // -------------------------------------------------------------------------
    // [useEffect: Q&A 목록 로드]
    // -------------------------------------------------------------------------

    /**
     * 마운트 시 1회 실행하여 서버에서 Q&A 목록을 가져옴.
     *
     * API: qnaService.getQnas(1, 20)
     *   → GET /api/qna?page=0&size=20&sort=createdAt,desc
     *   → 최신순 최대 20개 항목 조회
     *
     * Spring Page 응답 처리:
     *   data?.content: Spring Page 응답의 content 필드 (항목 배열)
     *   ?? data:        배열로 직접 응답하는 경우 폴백
     *   ?? []:          모든 경우 실패 시 빈 배열 폴백
     *
     * 응답 항목 변환(map):
     *   q.id          → id
     *   q.authorId    → userId (없으면 '')
     *   q.authorName ?? q.authorId ?? 'USER' → userName (toString().toUpperCase())
     *   q.title       → title
     *   q.content     → content
     *   q.createdAt?.slice(0,10).replace(/-/g, '.') → date ('YYYY.MM.DD' 형식)
     *   false         → isExpanded (기본 접힘 상태)
     *   []            → comments (로컬 전용 답변 배열)
     *
     * 실패 시: console.error로 에러 출력, qnas=[] 유지
     * finally: setIsLoading(false)
     *
     * 의존성 배열: [] → 마운트 시 1회만 실행
     */
    // 백엔드에서 QnA 목록 로드
    useEffect(() => {
        const loadQnas = async () => {
            // TODO: [1] qnaService.getQnas(1, 20) 호출
            //           → GET /api/qna?page=0&size=20&sort=createdAt,desc
            // TODO: [2] Spring Page 응답 처리:
            //           items = (data?.content ?? data ?? []).map((q) => ({...}))
            //           - q.id → id
            //           - q.authorId ?? '' → userId
            //           - (q.authorName ?? q.authorId ?? 'USER').toString().toUpperCase() → userName
            //           - q.title → title
            //           - q.content → content
            //           - q.createdAt?.slice(0,10).replace(/-/g, '.') → date
            //           - false → isExpanded (기본 접힘)
            //           - [] → comments (로컬 전용 답변 배열)
            // TODO: [3] setQnas(items) 호출
            // TODO: [4] catch 블록에서 console.error('QnA 목록 로드 실패', e)
            // 힌트: finally 블록에서 setIsLoading(false) 호출
        };
        loadQnas();
    }, []);

    // -------------------------------------------------------------------------
    // [핸들러 함수]
    // -------------------------------------------------------------------------

    /**
     * toggleExpand: 특정 Q&A 항목의 펼침/접힘 상태를 토글.
     *
     * @param {number|string} id - 토글할 Q&A 항목의 id
     *
     * 동작:
     *   qnas 배열을 map으로 순회하여 id가 일치하는 항목의 isExpanded만 반전.
     *   나머지 항목은 그대로 유지 (다른 항목 자동 접기 없음).
     */
    const toggleExpand = (id) => {
        setQnas(qnas.map(q => q.id === id ? { ...q, isExpanded: !q.isExpanded } : q));
    };

    /**
     * handleCreate: 새 Q&A 질문을 서버에 등록하는 함수.
     *
     * 동작 순서:
     *   1. 유효성 검사: newTitle 또는 newContent가 비어 있으면 즉시 반환 (API 호출 안 함)
     *   2. qnaService.createQna({ title: newTitle, content: newContent }) 호출
     *      → POST /api/qna { title, content }
     *      → 서버에서 id, authorId, authorName, createdAt 등이 포함된 응답 반환
     *   3. 응답 데이터를 qna 객체 형식으로 변환
     *   4. setQnas([newQna, ...qnas]): 새 항목을 목록 맨 앞에 추가 (최신순 유지)
     *   5. 실패 시: console.error + alert('질문 등록에 실패했습니다.')
     *   6. finally: newTitle='', newContent='', isWriting=false (폼 초기화 및 숨김)
     */
    const handleCreate = async () => {
        // TODO: [1] 유효성 검사: !newTitle || !newContent이면 즉시 return
        // TODO: [2] qnaService.createQna({ title: newTitle, content: newContent }) 호출
        // TODO: [3] 응답 데이터를 qna 객체 형식으로 변환:
        //           { id, userId(authorId), userName(authorName 대문자), title, content, date, isExpanded: false, comments: [] }
        // TODO: [4] setQnas([newQna, ...qnas]): 새 항목을 목록 맨 앞에 추가
        // TODO: [5] 실패 시: console.error + alert('질문 등록에 실패했습니다.')
        // 힌트: finally 블록에서 setNewTitle(''), setNewContent(''), setIsWriting(false) 호출
    };

    // -------------------------------------------------------------------------
    // [답변(댓글) 관련 상태 및 핸들러]
    // -------------------------------------------------------------------------

    /**
     * commentText: 각 Q&A 항목별 답변 입력 텍스트 맵.
     * { [qnaId]: string } 형태로, 각 Q&A의 답변 입력 필드 값을 분리 관리.
     * 예: { 1: '답변 텍스트', 3: '' }
     * handleAddComment에서 해당 qnaId 키의 값을 ''로 초기화.
     */
    const [commentText, setCommentText] = useState({});

    /**
     * handleAddComment: 특정 Q&A에 답변을 로컬에서 추가하는 함수.
     *
     * @param {number|string} qnaId - 답변을 추가할 Q&A 항목의 id
     *
     * ※ 중요: 백엔드 답변 API가 미구현 상태 → 서버 저장 없이 프론트엔드 상태에만 반영.
     *          페이지 새로고침 시 답변이 사라짐.
     *
     * 동작:
     *   1. commentText[qnaId]가 비어 있으면 즉시 반환
     *   2. 해당 qnaId 항목의 comments 배열에 새 댓글 객체 추가:
     *      { id: Date.now(), userName: 'ME', content: text, date: 'YYYY.MM.DD' }
     *      - id: Date.now()로 임시 고유 ID 생성 (서버 ID 없음)
     *      - userName: 항상 'ME' (실제 로그인 사용자명 미연동)
     *      - date: 현재 날짜를 ISO 형식에서 'YYYY.MM.DD'로 변환
     *   3. setCommentText: 해당 qnaId 입력값을 '' 로 초기화
     */
    const handleAddComment = (qnaId) => {
        // TODO: [1] text = commentText[qnaId]로 해당 Q&A의 입력값 취득
        // TODO: [2] text가 비어있으면 즉시 return
        // TODO: [3] setQnas()로 해당 qnaId 항목의 comments 배열에 새 댓글 객체 추가:
        //           { id: Date.now(), userName: 'ME', content: text,
        //             date: new Date().toISOString().slice(0, 10).replace(/-/g, '.') }
        //           힌트: qnas.map(q => q.id === qnaId ? { ...q, comments: [...] } : q)
        // TODO: [4] setCommentText({ ...commentText, [qnaId]: '' })로 해당 입력값 초기화
        // 주의: 백엔드 답변 API가 미구현 상태 → 서버 저장 없이 로컬 상태에만 반영됨
    };

    // -------------------------------------------------------------------------
    // [JSX 렌더링]
    // -------------------------------------------------------------------------

    return (
        <ResponsiveLayout showTabs={false}>
            {/* 전체 페이지 컨테이너 */}
            <div className="flex flex-col min-h-screen bg-[#f9f9fa] dark:bg-[#101215] text-black dark:text-[#e5e5e5]">

                {/* ============================================================
                    [섹션 1] 상단 고정 헤더
                    - 좌: ArrowLeft 버튼 → navigate(-1)
                    - 중: "Q&A 게시판" 제목
                    - 우: Plus 버튼 → setIsWriting(!isWriting) (작성 폼 토글)
                    - sticky top-0 z-40: 스크롤 시 최상단 고정
                ============================================================ */}
                {/* Header */}
                <div className="flex items-center justify-between h-14 px-4 bg-white dark:bg-[#1c1f24] border-b border-[#e5e5e5] dark:border-[#292e35] sticky top-0 z-40">
                    <button onClick={() => navigate(-1)} className="p-2">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="font-bold text-[16px]">Q&A 게시판</h1>
                    {/* Plus 버튼: 클릭 시 작성 폼 표시/숨김 토글 */}
                    <button
                        onClick={() => setIsWriting(!isWriting)}
                        className="p-2 text-black"
                    >
                        <Plus size={24} />
                    </button>
                </div>

                <div className="flex flex-col gap-4 p-4 pb-24">
                    {/* ============================================================
                        [섹션 2] 로딩 상태
                        isLoading=true일 때 "Loading..." 텍스트 펄스 애니메이션 표시
                    ============================================================ */}
                    {/* 로딩 상태 */}
                    {isLoading && (
                        <div className="py-10 text-center text-[13px] font-bold text-[#a3b0c1] italic uppercase tracking-widest animate-pulse">
                            Loading...
                        </div>
                    )}

                    {/* ============================================================
                        [섹션 3] 질문 작성 폼 (isWriting=true일 때만 표시)
                        - fade-in + slide-in-from-top-2 애니메이션으로 부드럽게 나타남
                        - 제목 입력 (input, 검정 테두리 포커스)
                        - 내용 입력 (textarea, 128px 높이, resize 비활성)
                        - 취소 버튼: setIsWriting(false) → 폼 숨김, 입력값 유지
                        - POST 버튼: handleCreate() 호출 → 서버 등록 후 폼 초기화
                    ============================================================ */}
                    {/* Write Form */}
                    {isWriting && (
                        <div className="bg-white dark:bg-[#1c1f24] rounded-2xl p-6 border border-black dark:border-[#e5e5e5] shadow-xl animate-in fade-in slide-in-from-top-2">
                            <h2 className="text-[12px] font-black italic tracking-widest uppercase mb-4">NEW QUESTION</h2>
                            {/* 질문 제목 입력 필드 */}
                            <input
                                type="text"
                                placeholder="제목을 입력하세요"
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                                className="w-full mb-3 p-3 bg-[#f3f3f3] dark:bg-[#292e35] text-black dark:text-[#e5e5e5] rounded-xl text-[14px] font-bold outline-none border border-transparent focus:border-black dark:focus:border-[#e5e5e5]"
                            />
                            {/* 질문 내용 입력 텍스트에어리어 */}
                            <textarea
                                placeholder="질문 내용을 입력하세요"
                                value={newContent}
                                onChange={e => setNewContent(e.target.value)}
                                className="w-full h-32 p-3 bg-[#f3f3f3] dark:bg-[#292e35] text-black dark:text-[#e5e5e5] rounded-xl text-[14px] font-medium outline-none border border-transparent focus:border-black dark:focus:border-[#e5e5e5] resize-none"
                            ></textarea>
                            <div className="flex gap-2 mt-4">
                                {/* 취소 버튼: 폼만 닫기 (입력값 유지) */}
                                <button onClick={() => setIsWriting(false)} className="flex-1 h-12 rounded-xl bg-[#f3f3f3] dark:bg-[#292e35] dark:text-[#e5e5e5] font-bold text-[14px]">취소</button>
                                {/* POST 버튼: handleCreate() 호출하여 서버에 질문 등록 */}
                                <button onClick={handleCreate} className="flex-1 h-12 rounded-xl bg-black text-white font-black italic tracking-widest uppercase text-[14px]">POST</button>
                            </div>
                        </div>
                    )}

                    {/* ============================================================
                        [섹션 4] Q&A 목록
                        - qnas 배열을 map으로 순회하여 접힘/펼침 카드 렌더링
                        - 카드 헤더 (항상 표시):
                            User 아이콘 원형 배경 (40px)
                            작성자명 (대문자, 이탤릭 회색)
                            날짜 (연한 회색)
                            질문 제목 (굵은 검정, 줄임 표시)
                            펼침 표시: ChevronDown(접힘) / ChevronUp(펼침)
                            클릭 시 toggleExpand(q.id) 호출
                        - 카드 본문 (isExpanded=true일 때만 표시):
                            질문 본문 (14px, 줄간격 relaxed, pre-wrap)
                            [답변 섹션]
                              MessageCircle 아이콘 + "Answers ({q.comments.length})"
                              답변 목록: 각 답변 카드 (ADMIN이면 파란 글씨)
                              답변 없음: "No answers yet"
                              [답변 입력 폼]
                                텍스트 입력 + SUBMIT 버튼
                                SUBMIT 클릭 → handleAddComment(q.id)
                                ※ 로컬 반영만, 서버 저장 없음
                    ============================================================ */}
                    {/* Q&A List */}
                    <div className="flex flex-col gap-3">
                        {qnas.map(q => (
                            <div key={q.id} className="bg-white dark:bg-[#1c1f24] rounded-2xl border border-[#f3f3f3] dark:border-[#292e35] overflow-hidden transition-all shadow-sm hover:border-[#ccd3db]">
                                {/* 카드 헤더: 클릭 시 해당 항목 펼침/접힘 토글 */}
                                <div
                                    onClick={() => toggleExpand(q.id)}
                                    className="p-5 flex items-start gap-4 cursor-pointer"
                                >
                                    {/* 사용자 아이콘 (원형 회색 배경) */}
                                    <div className="w-10 h-10 bg-[#f3f3f3] dark:bg-[#292e35] rounded-xl flex items-center justify-center shrink-0">
                                        <User size={20} className="text-[#a3b0c1]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            {/* 작성자명: 이탤릭 대문자 회색 */}
                                            <span className="text-[11px] font-black italic tracking-tighter text-[#a3b0c1] uppercase">{q.userName}</span>
                                            {/* 작성 날짜 */}
                                            <span className="text-[10px] text-[#ccd3db]">{q.date}</span>
                                        </div>
                                        {/* 질문 제목: 한 줄 줄임 표시(truncate) */}
                                        <h3 className="text-[15px] font-bold text-black dark:text-[#e5e5e5] truncate">{q.title}</h3>
                                    </div>
                                    {/* 펼침 방향 화살표: isExpanded에 따라 Up/Down */}
                                    <div className="text-[#ccd3db]">
                                        {q.isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>

                                {/* 카드 본문: isExpanded=true일 때만 렌더링 */}
                                {q.isExpanded && (
                                    <div className="px-5 pb-5 border-t border-[#fcfcfc] animate-in fade-in duration-300">
                                        {/* 질문 본문 텍스트 */}
                                        <div className="py-4 text-[14px] leading-relaxed text-[#424a54] font-medium whitespace-pre-wrap">
                                            {q.content}
                                        </div>

                                        {/* 답변(댓글) 섹션 */}
                                        <div className="mt-4 pt-4 border-t border-[#f3f3f3]">
                                            {/* 답변 섹션 헤더: MessageCircle 아이콘 + 답변 수 */}
                                            <div className="flex items-center gap-2 mb-4">
                                                <MessageCircle size={14} className="text-black" />
                                                <span className="text-[12px] font-black italic tracking-widest uppercase">Answers ({q.comments.length})</span>
                                            </div>

                                            {/* 답변 목록 */}
                                            <div className="flex flex-col gap-4 mb-6">
                                                {q.comments.length > 0 ? q.comments.map(c => (
                                                    <div key={c.id} className="bg-[#f9f9fa] dark:bg-[#101215] p-4 rounded-xl border border-[#f3f3f3] dark:border-[#292e35]">
                                                        <div className="flex justify-between items-center mb-1">
                                                            {/* 답변 작성자: ADMIN이면 파란색, 그 외 검정 */}
                                                            <span className={`text-[11px] font-black italic tracking-tighter uppercase ${c.userName === 'ADMIN' ? 'text-blue-600' : 'text-black'}`}>
                                                                {c.userName}
                                                            </span>
                                                            <span className="text-[10px] text-[#ccd3db] font-bold">{c.date}</span>
                                                        </div>
                                                        <p className="text-[13px] font-medium text-[#424a54]">{c.content}</p>
                                                    </div>
                                                )) : (
                                                    // 답변 없음 빈 상태
                                                    <p className="text-[12px] text-[#ccd3db] font-bold italic text-center py-2 uppercase">No answers yet</p>
                                                )}
                                            </div>

                                            {/* 답변 입력 폼: 텍스트 입력 + SUBMIT 버튼
                                                ※ 로컬 반영만 (백엔드 답변 API 미구현) */}
                                            {/* Comment Input */}
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="답변을 입력하세요..."
                                                    value={commentText[q.id] || ''}
                                                    onChange={e => setCommentText({ ...commentText, [q.id]: e.target.value })}
                                                    className="flex-1 h-10 px-4 bg-[#f3f3f3] dark:bg-[#292e35] text-black dark:text-[#e5e5e5] rounded-xl text-[13px] font-medium outline-none border border-transparent focus:border-black dark:focus:border-[#e5e5e5]"
                                                />
                                                {/* SUBMIT 버튼: handleAddComment(q.id) 호출 */}
                                                <button
                                                    onClick={() => handleAddComment(q.id)}
                                                    className="px-4 h-10 bg-black text-white rounded-xl text-[11px] font-black italic tracking-widest uppercase"
                                                >
                                                    SUBMIT
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* ============================================================
                        [섹션 5] 빈 상태 안내
                        isWriting=false이고 qnas 배열이 비어 있을 때만 표시.
                        HelpCircle 아이콘 원형 배경 + "No questions yet" 텍스트
                    ============================================================ */}
                    {!isWriting && qnas.length === 0 && (
                        <div className="py-20 text-center">
                            <div className="w-16 h-16 bg-white dark:bg-[#1c1f24] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#f3f3f3] dark:border-[#292e35]">
                                <HelpCircle size={32} className="text-[#ccd3db]" />
                            </div>
                            <p className="text-[14px] font-bold text-[#a3b0c1] uppercase italic tracking-widest">No questions yet</p>
                        </div>
                    )}
                </div>
            </div>
        </ResponsiveLayout>
    );
}
