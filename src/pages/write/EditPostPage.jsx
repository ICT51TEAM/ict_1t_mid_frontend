/**
 * @file EditPostPage.jsx - 최종 권장 버전
 * @description 모든 오류 수정 + location.pathname 권장 방식 적용
 * 
 * 적용된 수정사항:
 * ✅ FIX 1: useAuth import 추가 (authLoading 정의)
 * ✅ FIX 2-3: useEffect 의존성 완성 + canvasFile 처리 분리
 * ✅ FIX 4-5: canvasFile 처리 useEffect 개선
 * ✅ FIX 6: getCurrentUserId 간소화 (user 객체 직접 사용)
 * ✅ FIX 7: handleCanvasStart 최적화 (location.pathname 사용) ⭐ 권장
 * ✅ FIX 8: 레이아웃 max-w-2xl 래퍼 추가
 * ✅ FIX 9: Edit import 제거
 * ✅ FIX 10: alt 텍스트 추가
 * ✅ FIX 11: tags 배열 검증
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, X, Calendar, Loader2, ImagePlus } from 'lucide-react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { postService } from '@/api/postService';
import { photoService } from '@/api/photoService';
import { albumService } from '@/api/albumService';
import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { saveAlbumLayout } from '@/utils/albumLayoutStore';

const layouts = [
    { id: 1, name: '1장', grid: 'grid-cols-1', apiValue: 'single' },
    { id: 2, name: '2장 가로', grid: 'grid-cols-2', apiValue: 'horizontal-two' },
    { id: 3, name: '2장 세로', grid: 'grid-rows-2', apiValue: 'vertical-two' },
    { id: 4, name: '4장', grid: 'grid-cols-2 grid-rows-2', apiValue: 'grid' },
];

const VISIBILITY_MAP = {
    private: 'PRIVATE',
    friends: 'FRIENDS',
    public: 'PUBLIC',
};
useParams
const VISIBILITY_REVERSE_MAP = {
    PRIVATE: 'private',
    FRIENDS: 'friends',
    PUBLIC: 'public',
};

const normalizeLayoutTypeFromApi = (apiLayoutType) => {
    if (!apiLayoutType) return 1;
    const normalized = apiLayoutType.toUpperCase();
    if (normalized.includes('SINGLE') || normalized === '1') return 1;
    if (normalized.includes('GRID_2') || normalized.includes('HORIZONTAL')) return 2;
    if (normalized.includes('GRID_3') || normalized.includes('VERTICAL')) return 3;
    if (normalized.includes('GRID_4') || normalized === '4') return 4;
    return 1;
};

export default function EditPostPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // ✅ FIX 1: useAuth 훅에서 authLoading 추출
    const { user, authLoading } = useAuth();
    const { showAlert, showConfirm } = useAlert();

    // ---------------------------------------------------------
    // [상태 변수]
    // ---------------------------------------------------------
    const [photos, setPhotos] = useState([]);
    const [selectedLayout, setSelectedLayout] = useState(1);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [visibility, setVisibility] = useState('private');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // ---------------------------------------------------------
    // [useEffect 1] 게시물 로드
    // ---------------------------------------------------------
    useEffect(() => {
        console.log("🔍 Effect 실행됨! - ID:", id, "CanvasData:", !!location.state?.canvasFile);
        // ✅ FIX 2: 캔버스에서 돌아온 경우 API 호출 방지
        if (location.state?.canvasFile) {
            console.log("🛑 방어막 작동: 서버 호출을 취소합니다.");
            setIsLoading(false);
            return;
        }

        // ✅ FIX 3: 인증 로딩 중일 때 대기
        if (authLoading) {
            console.log("⏳ 인증 대기 중...");
            return;
        }

        const loadPost = async () => {
            try {
                const post = await postService.getPost(id);

                const existingPhotos = (post.photos || [])
                    .slice()
                    .sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0))
                    .map(p => ({
                        url: p.photoUrl,
                        file: null,
                        isExisting: true,
                        photoId: p.photoId,
                    }));

                const layoutId = normalizeLayoutTypeFromApi(post.layoutType);

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
                console.log('[EditPostPage] 초기 데이터 로드 성공');
            } catch (err) {
                console.log('[EditPostPage] getPost 실패:', err);
                showAlert('게시글을 불러오는데 실패했습니다.', '알림');
                navigate(-1);
            } finally {
                setIsLoading(false);
            }
        };
        console.log("🚀 서버 데이터 로드 시작(loadPost)");
        loadPost();
    }, [id, authLoading, navigate, showAlert]);

    // ---------------------------------------------------------
    // [useEffect 2] 캔버스에서 돌아온 데이터 처리
    // ---------------------------------------------------------
    // ✅ FIX 4-5: canvasFile 별도 useEffect + location.pathname 사용
    useEffect(() => {
        const canvasData = location.state?.canvasFile;
        const preserved = location.state?.preservedData;

        if (canvasData) {
            const { url, file, editIndex } = canvasData;

            // 1. 먼저 텍스트 및 기타 데이터 복구
            if (preserved) {
            if (preserved.title !== undefined) setTitle(preserved.title);
            if (preserved.content !== undefined) setContent(preserved.content);
            if (preserved.tags) setTags(preserved.tags);
            if (preserved.visibility) setVisibility(preserved.visibility);
            if (preserved.date) setSelectedDate(preserved.date);
        }

            setPhotos(prev => {
                const currentPhotos = Array.isArray(preserved?.photos) ? [...preserved.photos] : [];
            const newPhotoObj = { url, file, isExisting: false, photoId: null };

                if (typeof editIndex === 'number' && editIndex >= 0 && currentPhotos.length > editIndex) {
                currentPhotos[editIndex] = {
                    ...currentPhotos[editIndex], 
                    url: url,
                    file: file,
                    isExisting: false // 편집된 이미지는 새로 서버에 올려야 하므로 false
                };
                console.log(`${editIndex}번 사진 교체 완료`);
                } else {
                    currentPhotos.push(newPhotoObj);
                    console.log("새 사진 추가 완료");
                }
                return currentPhotos;
            });

            //✅ location.pathname 사용으로 현재 경로 유지
            navigate(location.pathname, {
                replace: true,
                state: {
                    ...location.state,
                    canvasFile: undefined,
                    preservedData: undefined
                }
            });
        }
    }, [location.state?.canvasFile, navigate, location.pathname]);

    // ---------------------------------------------------------
    // [함수] 사진 관리
    // ---------------------------------------------------------
    const handlePhotoUpload = (e) => {
        const files = e.target.files;
        if (!files) return;

        const newPhotoObjects = Array.from(files).map(file => ({
            url: URL.createObjectURL(file),
            file: file,
            isExisting: false,
            photoId: null,
        }));

        const updatedPhotos = [...photos, ...newPhotoObjects].slice(0, 4);
        setPhotos(updatedPhotos);
        autoSetLayout(updatedPhotos.length);
        e.target.value = '';
    };

    const removePhoto = (index) => {
        const newPhotos = photos.filter((_, i) => i !== index);
        setPhotos(newPhotos);
        autoSetLayout(newPhotos.length);
    };

    const autoSetLayout = (count) => {
        if (count === 1) setSelectedLayout(1);
        else if (count === 2 || count === 3) setSelectedLayout(2);
        else if (count >= 4) setSelectedLayout(4);
    };

    const getAvailableLayouts = () => {
        if (photos.length === 0) return [];
        if (photos.length === 1) return layouts.filter(l => l.id === 1);
        if (photos.length <= 3) return layouts.filter(l => l.id === 2 || l.id === 3);
        return layouts.filter(l => l.id === 4);
    };

    const handleAddTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const getLayoutType = (layoutId) => {
        return layouts.find(l => l.id === layoutId)?.apiValue ?? 'single';
    };

    // ✅ FIX 6: user 객체 직접 사용 (localStorage 제거)
    const getCurrentUserId = () => {
        return user?.id ?? null;
    };

    // ✅ FIX 7: location.pathname 사용 (권장 방식 - 라우터 경로와 상관없이 항상 정확함)
    const handleCanvasStart = (index = null) => {
        console.log("🚀 캔버스로 보낼 데이터:", { id, index, title });
        const isEditMode = typeof index === 'number';

        // 🎯 핵심: location.pathname 사용으로 현재 경로 동적 캡처
        const currentPath = location.pathname;

        console.log('[EditPostPage - handleCanvasStart]', {
            mode: isEditMode ? 'edit' : 'create',
            editIndex: index,
            currentPath,
            albumId: id
        });

        navigate('/create-canvas', {
            state: {
                mode: isEditMode ? 'edit' : 'create',
                albumId: id,
                editIndex: index,
                returnPath: location.pathname,
                initialImage: isEditMode && photos[index] ? photos[index].url : null,
                // 💡 현재 입력 중인 데이터를 보관함에 넣어서 보냅니다!
                preservedData: {
                    title: title,
                    content: content,
                    tags: tags,
                    visibility: visibility,
                    date: selectedDate,
                    photos: photos // 기존 사진 목록도 보냅니다.
                }
            }
        });
    };

    // ---------------------------------------------------------
    // [함수] 게시물 업데이트
    // ---------------------------------------------------------
    const handleUpdate = () => {
        if (!title.trim()) {
            showAlert('제목을 입력해주세요.', '입력 오류', 'alert');
            return;
        }
        if (!content.trim()) {
            showAlert('내용을 입력해주세요.', '입력 오류', 'alert');
            return;
        }
        if (photos.length === 0) {
            showAlert('사진을 1장 이상 등록해주세요.', '입력 오류', 'alert');
            return;
        }

        showConfirm({
            message: '게시물을 수정하시겠습니까?',
            title: '게시물 수정',
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
                    const newPhotos = photos.filter(p => !p.isExisting);
                    let newPhotoIds = [];

                    if (newPhotos.length > 0) {
                        const uploadResult = await photoService.uploadPhotos({
                            files: newPhotos.map(p => p.file),
                            userId,
                        });
                        newPhotoIds = (uploadResult?.photos ?? []).map(p => p.photoId);
                        if (newPhotoIds.length === 0) throw new Error('업로드된 사진 정보가 없습니다.');
                    }

                    let newIdx = 0;
                    const photoIds = photos.map(p => {
                        if (p.isExisting) return p.photoId;
                        return newPhotoIds[newIdx++];
                    });
                    const slotIndexes = photoIds.map((_, i) => i);

                    // ✅ FIX 6: user 객체에서 직접 가져오기
                    const username = user?.username || '';

                    // ✅ FIX 11: tags 배열 검증
                    const updatePayload = {
                        title: title.trim(),
                        bodyText: content.trim(),
                        visibility: VISIBILITY_MAP[visibility],
                        recordDate: selectedDate,
                        layoutType: getLayoutType(selectedLayout),
                        photoIds: photoIds.map(id => Number(id)),
                        slotIndexes: slotIndexes.map(idx => Number(idx)),
                        tags: Array.isArray(tags) ? tags : []
                    };

                    console.log('[EditPostPage] 최종 전송 데이터:', updatePayload);

                    const result = await albumService.updateAlbum(id, updatePayload);

                    console.log('[EditPostPage] updateAlbum 성공');
                    showAlert('수정되었습니다.', '완료', 'success');
                    saveAlbumLayout(id, getLayoutType(selectedLayout));
                    navigate(`/snap/${id}`);
                } catch (err) {
                    console.log('[EditPostPage] 수정 실패:', err);
                    const message = err.response?.data?.message || err.message || '수정에 실패했습니다.';
                    showAlert(message, '수정 실패', 'alert');
                } finally {
                    setIsSubmitting(false);
                }
            },
        });
    };

    // ---------------------------------------------------------
    // [렌더링]
    // ---------------------------------------------------------
    if (isLoading) return (
        <div className="min-h-screen bg-[#f9f9fa] dark:bg-[#101215] flex items-center justify-center">
            <div className="font-bold italic opacity-20 animate-pulse uppercase tracking-widest">
                Loading...
            </div>
        </div>
    );

    return (
        <ResponsiveLayout showTabs={false}>
            <div className="min-h-screen bg-[#f9f9fa] dark:bg-[#101215] text-black dark:text-white transition-colors duration-300 pb-20">

                {/* Header */}
                <div className="flex items-center justify-between h-14 px-4 bg-white dark:bg-[#1c1f24] border-b border-[#e5e5e5] dark:border-[#292e35] sticky top-0 z-40 transition-colors duration-300">
                    <button onClick={() => navigate(-1)} className="p-2">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="font-bold text-[16px]">게시물 수정</h1>
                    <div className="w-10" />
                </div>

                <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">

                    {/* 작성 날짜 선택 */}
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

                    {/* 사진 등록 */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-[14px] font-bold text-gray-500 dark:text-gray-400">
                                사진 등록 (최대 4장)
                            </h3>
                            <button
                                onClick={() => handleCanvasStart()}
                                className="text-[14px] font-bold text-indigo-500 flex items-center gap-1 hover:text-indigo-600 transition-colors"
                            >
                                🎨 캔버스에서 작업하기
                            </button>
                        </div>

                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
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

                            {/* ✅ FIX 10: alt 텍스트 추가 */}
                            {photos.map((photo, index) => (
                                <div key={index} className="relative w-24 h-24 flex-shrink-0 rounded-2xl overflow-hidden shadow-sm border border-[#e5e5e5] dark:border-[#292e35]">
                                    <img src={photo.url} alt={`photo-${index}`} className="w-full h-full object-cover" />

                                    {!photo.isExisting && (
                                        <div className="absolute top-1.5 left-1.5 bg-indigo-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full z-10 shadow-md">
                                            NEW
                                        </div>
                                    )}

                                    <button
                                        onClick={() => handleCanvasStart(index)}
                                        className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm text-white py-1 flex items-center justify-center gap-1 active:bg-black transition-colors"
                                    >
                                        <span className="text-[10px] font-bold">🎨 수정</span>
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removePhoto(index);
                                        }}
                                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white active:bg-red-500 transition-colors z-20"
                                    >
                                        <X size={12} strokeWidth={3} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 레이아웃 선택 */}
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
                                        onClick={() => setSelectedLayout(layout.id)}
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
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ✅ FIX 8: max-w-2xl 래퍼 추가 */}
                <div className="space-y-6 max-w-2xl mx-auto px-4">
                    {/* 제목 + 내용 */}
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
                            placeholder="오늘의 이야기를 들려주세요"
                            className="w-full h-48 p-4 bg-white dark:bg-[#1c1f24] border border-[#e5e5e5] dark:border-[#292e35] rounded-2xl resize-none text-[14px] font-medium leading-relaxed outline-none focus:border-black dark:focus:border-white transition-all shadow-sm"
                        />
                    </div>
                </div>

                {/* ✅ FIX 8: max-w-2xl 래퍼 추가 */}
                <div className="space-y-4 max-w-2xl mx-auto px-4">
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

                {/* ✅ FIX 8: max-w-2xl 래퍼 추가 */}
                <div className="pt-6 border-t border-[#e5e5e5] dark:border-[#292e35] max-w-2xl mx-auto px-4">
                    <h3 className="text-[14px] font-bold text-gray-500 dark:text-gray-400 mb-4 text-center">공개범위 설정</h3>
                    <div className="flex gap-3 max-w-sm mx-auto">
                        {[
                            { value: 'private', label: '나만보기' },
                            { value: 'friends', label: '글벗만' },
                            { value: 'public', label: '전체공개' },
                        ].map(option => (
                            <button
                                key={option.value}
                                onClick={() => setVisibility(option.value)}
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

                {/* ✅ FIX 8: max-w-2xl 래퍼 추가 */}
                <div className="max-w-2xl mx-auto px-4 pt-8">
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
                            '내 스토리 수정'
                        )}
                    </button>
                </div>
            </div>
        </ResponsiveLayout>
    );
}
