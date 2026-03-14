import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Text, Image as KonvaImage, Transformer } from 'react-konva';
import { useLocation, useNavigate } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import {
    ArrowLeft, Type, Image as ImageIcon, Layers, Trash2, Eye, 
  CheckCircle, X, ChevronUp, ChevronDown, ChevronsUp, ChevronsDown
} from 'lucide-react';
import { useAlert } from '@/context/AlertContext';

// ── dataURL → File 객체 변환 ──────────────────────────────────────────
// CreatePhotoAlbumPage가 canvasFile: { url, file } 형태를 요구
function dataUrlToFile(dataUrl, filename = `canvas_${Date.now()}.png`) {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
}

// ── 공용 저장 액션 모달 ───────────────────────────────────────────────
function SaveActionModal({ dataUrl, onClose, onDownload, onSendToAlbum }) {
    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={onClose}
        >
            <div
                className="relative bg-white dark:bg-[#1c1f24] rounded-3xl shadow-2xl overflow-hidden w-full max-w-sm"
                style={{ animation: 'modalIn 0.22s cubic-bezier(.34,1.56,.64,1)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* 헤더 */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <Eye size={16} className="text-blue-500" />
                        <span className="font-bold text-sm dark:text-white">최종 미리보기</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        <X size={15} className="text-gray-500 dark:text-gray-300" />
                    </button>
                </div>

                {/* 미리보기 이미지 */}
                <div className="p-4">
                    <img
                        src={dataUrl}
                        alt="캔버스 미리보기"
                        className="w-full rounded-2xl shadow-md"
                        style={{ aspectRatio: '3/4', objectFit: 'cover' }}
                    />
                </div>

                {/* 액션 버튼 */}
                <div className="px-4 pb-5 flex gap-3">
                    <button
                        onClick={onDownload}
                        className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 py-3 rounded-2xl text-sm font-bold transition-colors"
                    >
                        <Download size={16} /> 다운로드
                    </button>
                    <button
                        onClick={onSendToAlbum}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-2xl text-sm font-bold transition-colors"
                    >
                        <Send size={16} /> 사진첩에 추가
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes modalIn {
                    from { opacity: 0; transform: scale(0.88) translateY(16px); }
                    to   { opacity: 1; transform: scale(1)    translateY(0);    }
                }
            `}</style>
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════
export default function CanvasEditor() {
    const navigate = useNavigate();
    const location = useLocation();
    const { showAlert } = useAlert();

    const [elements, setElements] = useState([
        { id: '1', type: 'text', text: '오늘 하루, 나의 스토리를 만들어보세요', x: 20, y: 50, fontSize: 24, fill: '#333333', fontWeight: 'normal', fontFamily: 'sans-serif', fontStyle: 'normal' },
    ]);
    const [selectedId, setSelectedId] = useState(null);
    const [stageSize, setStageSize] = useState({ width: 375, height: 500 });
    const [editingId, setEditingId] = useState(null);
    const [editingValue, setEditingValue] = useState('');
    const [showLayers, setShowLayers] = useState(false);

    // 미리보기 버튼 & 저장 버튼 — 같은 모달 컴포넌트를 공유
    const [modalDataUrl, setModalDataUrl] = useState(null);  // null이면 모달 닫힘

    // textarea 드래그
    const [textareaPos, setTextareaPos] = useState({ top: 0, left: 0, width: 300, height: 60 });
    const [isDraggingTextarea, setIsDraggingTextarea] = useState(false);
    const dragStartRef = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });

    const containerRef = useRef(null);
    const stageRef = useRef(null);
    const trRef = useRef(null);
    const shapeRefs = useRef({});
    const textareaRef = useRef(null);

    const [textStyle, setTextStyle] = useState({
        fontSize: 24, fill: '#333333', fontFamily: 'sans-serif',
        fontWeight: 'normal', fontStyle: 'normal',
    });

    // ── 캔버스 → DataURL (Transformer 제외) ──────────────────────────
    const exportCanvas = useCallback(() => {
        const stage = stageRef.current;
        if (!stage) return null;
        stage.find('Transformer').forEach(t => t.hide());
        stage.batchDraw();
        const dataUrl = stage.toDataURL({ pixelRatio: 2 });
        stage.find('Transformer').forEach(t => t.show());
        if (selectedId && trRef.current) {
            const node = shapeRefs.current[selectedId];
            if (node) { trRef.current.nodes([node]); trRef.current.getLayer().batchDraw(); }
        }
        return dataUrl;
    }, [selectedId]);

    // ── 미리보기 버튼 ─────────────────────────────────────────────────
    const handlePreview = () => {
        const dataUrl = exportCanvas();
        if (dataUrl) setModalDataUrl(dataUrl);
    };

    // ── 이미지를 클릭했을 때 호출되는 함수 ─────────────────────────────────────────────────
    const handleSelectImage = (imageUrl, index) => {
        navigate('/create-canvas', {
            state: {
                initialImage: imageUrl,
                albumId: id,        // 현재 수정 중인 게시물 ID (useParams에서 가져온 것)
                editIndex: index,   // 몇 번째 사진을 수정 중인지
                mode: 'edit'
            }
        });
    };


    // ── 저장 버튼 — 미리보기와 동일한 모달 표시 ──────────────────────
    const handleSave = () => {
        const dataUrl = exportCanvas();
        if (dataUrl) setModalDataUrl(dataUrl);
    };

    // ── 모달: 다운로드 ───────────────────────────────────────────────
    const handleDownload = () => {
        if (!modalDataUrl) return;
        const link = document.createElement('a');
        link.download = `canvas_${Date.now()}.png`;
        link.href = modalDataUrl;
        link.click();
        setModalDataUrl(null);
        showAlert('이미지가 다운로드되었습니다.');
    };

    // ── 모달: 포토앨범으로 이동 ──────────────────────────────────────
    // CreatePhotoAlbumPage가 기대하는 형태:
    //   location.state.canvasFile = { url: string, file: File }
    const handleSendToAlbum = async () => {
        try {
            if (!modalDataUrl) return;

            // 1. 수정 페이지에서 넘겨준 albumId와 인덱스 확인
            const albumId = location.state?.albumId;
            const editIndex = location.state?.editIndex;

            console.log("보내기 전 데이터 확인:", { albumId, editIndex });

            const file = dataUrlToFile(modalDataUrl);
            const url = modalDataUrl;

            // 2. 목적지 결정: id가 있으면 수정페이지, 없으면 등록페이지
            const returnUrl = location.state?.returnPath || `/snap/${location.state?.albumId}/edit`;

            console.log("실제 이동할 경로(returnUrl):", returnUrl);

            setModalDataUrl(null);
            showAlert('편집이 완료되었습니다!', '알림', 'success');

            // 3. setTimeout 구문 교정
            setTimeout(() => {
                navigate(returnUrl, {
                    state: {
                        canvasFile: {
                            url: url,
                            file: file,
                            editIndex: location.state?.editIndex
                        }, // 👈 1. 여기 쉼표가 있는지 확인!
                        albumId: location.state?.albumId, // 👈 2. 여기 쉼표가 있는지 확인!
                        returnPath: location.state?.returnPath, // 👈 3. 여기 쉼표가 있는지 확인!

                        // 💡 받았던 보관함을 그대로 다시 돌려줍니다.
                        preservedData: location.state?.preservedData
                    },
                    replace: true // 뒤로가기 시 캔버스가 다시 나오지 않게 함
                });
            }, 500); // 0.5초 뒤 이동

        } catch (error) {
            console.error(error);
            showAlert('저장에 실패했습니다.', '이미지 저장 실패', 'alert');
        }
    };

    // ── 텍스트 더블클릭: 편집 모드 진입 ──────────────────────────────
    const handleTextDblClick = (e, el) => {
        const textNode = e.target;
        const stage = stageRef.current;
        const container = containerRef.current;
        if (!stage || !container) return;

        const containerRect = container.getBoundingClientRect();
        const stageBox = stage.container().getBoundingClientRect();
        const offsetX = stageBox.left - containerRect.left;
        const offsetY = stageBox.top - containerRect.top;

        setEditingId(el.id);
        setEditingValue(el.text);
        setTextStyle({
            fontSize: el.fontSize || 24,
            fill: el.fill || '#333333',
            fontWeight: el.fontWeight || 'normal',
            fontFamily: el.fontFamily || 'sans-serif',
            fontStyle: el.fontStyle || 'normal',
        });
        setTextareaPos({
            top: textNode.y() + offsetY,
            left: textNode.x() + offsetX,
            width: Math.max(textNode.width() + 40, stageSize.width * 0.75),
            height: Math.max(textNode.height() + 20, 60),
        });
    };

    // ── 편집 완료 ─────────────────────────────────────────────────────
    const handleTextSubmit = useCallback(() => {
        if (!editingId) return;
        setElements(prev => prev.map(item =>
            item.id === editingId
                ? { ...item, text: editingValue, fontSize: textStyle.fontSize, fill: textStyle.fill, fontWeight: textStyle.fontWeight, fontFamily: textStyle.fontFamily, fontStyle: textStyle.fontStyle }
                : item
        ));
        setEditingId(null);
    }, [editingId, editingValue, textStyle]);

    // ── textarea 드래그 ───────────────────────────────────────────────
    const handleTextareaDragStart = (e) => {
        e.preventDefault();
        setIsDraggingTextarea(true);
        dragStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, posX: textareaPos.left, posY: textareaPos.top };
    };
    useEffect(() => {
        if (!isDraggingTextarea) return;
        const onMove = (e) => {
            const dx = e.clientX - dragStartRef.current.mouseX;
            const dy = e.clientY - dragStartRef.current.mouseY;
            setTextareaPos(prev => ({ ...prev, left: dragStartRef.current.posX + dx, top: dragStartRef.current.posY + dy }));
        };
        const onUp = () => setIsDraggingTextarea(false);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [isDraggingTextarea]);

    // ── 요소 삭제 ─────────────────────────────────────────────────────
    const handleDelete = () => {
        if (!selectedId) return;
        setElements(prev => prev.filter(el => el.id !== selectedId));
        setSelectedId(null);
    };

    // ── 이미지 업로드 ─────────────────────────────────────────────────
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const imgEl = new window.Image();
            imgEl.src = reader.result;
            imgEl.onload = () => {
                const newImg = {
                    id: Date.now().toString(), type: 'image', image: imgEl,
                    x: 50, y: 100, width: 200,
                    height: (imgEl.height / imgEl.width) * 200,
                };
                setElements(prev => [...prev, newImg]);
                setSelectedId(newImg.id);
            };
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    // ── 레이어 순서 변경 ──────────────────────────────────────────────
    const moveLayer = (id, direction) => {
        setElements(prev => {
            const idx = prev.findIndex(el => el.id === id);
            if (idx === -1) return prev;
            const arr = [...prev];
            if (direction === 'up' && idx < arr.length - 1) [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
            else if (direction === 'down' && idx > 0) [arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]];
            else if (direction === 'top') { const [it] = arr.splice(idx, 1); arr.push(it); }
            else if (direction === 'bottom') { const [it] = arr.splice(idx, 1); arr.unshift(it); }
            return arr;
        });
    };

    // ── 반응형 캔버스 ─────────────────────────────────────────────────
    useEffect(() => {
        const onResize = () => {
            if (containerRef.current) {
                const w = containerRef.current.offsetWidth;
                setStageSize({ width: w, height: w * 1.33 });
            }
        };
        onResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // ── 외부에서 전달받은 이미지 로드 ──────────────────────────────────────
    useEffect(() => {
        const imageUrl = location.state?.initialImage;

        if (imageUrl && stageSize.width > 0) {
            console.log("🎨 이미지 로딩 시작:", imageUrl);
            const imgEl = new window.Image();
            imgEl.src = imageUrl;
            imgEl.crossOrigin = "Anonymous";

            imgEl.onload = () => {
                const newImg = {
                    id: 'initial-bg',
                    type: 'image',
                    image: imgEl,
                    x: 0,
                    y: 0,
                    width: stageSize.width,
                    height: (imgEl.height / imgEl.width) * stageSize.width,
                    draggable: true,
                };
                setElements(prev => {
                    // 이미 initial-bg가 있다면 중복 추가 방지
                    if (prev.find(el => el.id === 'initial-bg')) return prev;
                    return [newImg, ...prev];
                });
            };
        }
    }, [location.state?.initialImage, stageSize.width]);


    // ── Transformer 연결 ──────────────────────────────────────────────
    useEffect(() => {
        if (selectedId && trRef.current) {
            const node = shapeRefs.current[selectedId];
            if (node) { trRef.current.nodes([node]); trRef.current.getLayer().batchDraw(); }
        } else if (trRef.current) {
            trRef.current.nodes([]);
        }
    }, [selectedId, elements]);

    const selectedEl = elements.find(el => el.id === selectedId);

    return (
        <ResponsiveLayout showTabs={false}>
            <div className="min-h-screen bg-gray-50 dark:bg-[#101215] pb-20 font-sans">

                {/* ── 1. 상단 네비게이션 헤더 ── */}
                <div className="flex items-center justify-between h-14 px-4 bg-white dark:bg-[#1c1f24] border-b border-[#e5e5e5] dark:border-[#292e35] sticky top-0 z-[60] transition-colors duration-300">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <ArrowLeft size={24} className="dark:text-white" />
                    </button>
                    <h1 className="font-bold text-[16px] dark:text-white">이미지 캔버스</h1>
                    <div className="w-10" />
                </div>

                {/* ── 2. 편집 툴바 (헤더 아래에 고정) ── */}
                <div className="h-16 bg-white dark:bg-[#1c1f24] border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 sticky top-14 z-50 shadow-sm">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => setElements(prev => [...prev, {
                                id: Date.now().toString(), type: 'text', text: '새 문구 입력',
                                x: 50, y: 50, fontSize: 24, fill: '#333333',
                                fontWeight: 'normal', fontFamily: 'sans-serif', fontStyle: 'normal',
                            }])}
                            className="flex items-center gap-1.5 text-xs font-bold bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-xl dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0"
                        >
                            <Type size={15} /> 텍스트
                        </button>

                        <input type="file" id="img-up" className="hidden" accept="image/*" onChange={handleImageUpload} />
                        <label htmlFor="img-up" className="flex items-center gap-1.5 text-xs font-bold bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-xl cursor-pointer dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0">
                            <ImageIcon size={15} /> 이미지
                        </label>

                        <button
                            onClick={() => setShowLayers(v => !v)}
                            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-colors shrink-0 ${showLayers ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                        >
                            <Layers size={15} /> 레이어
                        </button>

                        {selectedId && (
                            <button onClick={handleDelete} className="flex items-center gap-1.5 text-xs font-bold bg-red-100 text-red-600 px-3 py-2 rounded-xl hover:bg-red-200 transition-colors shrink-0">
                                <Trash2 size={15} /> 삭제
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2 shrink-0 ml-2">
                        <button onClick={handlePreview} className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-xl text-xs font-bold transition-colors">
                            <Eye size={15} />
                        </button>
                        <button onClick={handleSave} className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors">
                            저장
                        </button>
                    </div>
                </div>

                <div className="max-w-md mx-auto py-6 px-4">
                    {/* ── 레이어 패널 ── */}
                    {showLayers && (
                        <div className="mb-4 bg-white dark:bg-[#1c1f24] rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-sm font-bold dark:text-white flex items-center gap-2">
                                    <Layers size={14} /> 레이어 순서
                                </span>
                                <button onClick={() => setShowLayers(false)} className="text-gray-400 hover:text-gray-600"><X size={15} /></button>
                            </div>
                            <div className="max-h-60 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/50">
                                {[...elements].reverse().map((el, revIdx) => {
                                    const realIdx = elements.length - 1 - revIdx;
                                    const isTop = realIdx === elements.length - 1;
                                    const isBottom = realIdx === 0;
                                    return (
                                        <div
                                            key={el.id}
                                            onClick={() => setSelectedId(el.id)}
                                            className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors ${selectedId === el.id ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'}`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span className="text-lg">{el.type === 'text' ? '✏️' : '🖼️'}</span>
                                                <span className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                                                    {el.type === 'text' ? el.text : `이미지 #${el.id.slice(-4)}`}
                                                </span>
                                            </div>
                                            <div className="flex gap-1 shrink-0">
                                                <button onClick={(e) => { e.stopPropagation(); moveLayer(el.id, 'top'); }} disabled={isTop} className="p-1 text-blue-500 disabled:opacity-20"><ChevronsUp size={14} /></button>
                                                <button onClick={(e) => { e.stopPropagation(); moveLayer(el.id, 'up'); }} disabled={isTop} className="p-1 dark:text-gray-300 disabled:opacity-20"><ChevronUp size={14} /></button>
                                                <button onClick={(e) => { e.stopPropagation(); moveLayer(el.id, 'down'); }} disabled={isBottom} className="p-1 dark:text-gray-300 disabled:opacity-20"><ChevronDown size={14} /></button>
                                                <button onClick={(e) => { e.stopPropagation(); moveLayer(el.id, 'bottom'); }} disabled={isBottom} className="p-1 text-red-400 disabled:opacity-20"><ChevronsDown size={14} /></button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── 캔버스 영역 ── */}
                    <div ref={containerRef} className="relative w-full bg-white shadow-2xl rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800" style={{ aspectRatio: '3/4' }}>
                        <Stage
                            width={stageSize.width}
                            height={stageSize.height}
                            ref={stageRef}
                            onMouseDown={(e) => {
                                if (e.target === e.target.getStage()) {
                                    setSelectedId(null);
                                    if (editingId) handleTextSubmit();
                                }
                            }}
                        >
                            <Layer>
                                {elements.map((el) =>
                                    el.type === 'text' ? (
                                        <Text
                                            key={el.id} id={el.id} x={el.x} y={el.y}
                                            text={el.text} fontSize={el.fontSize} fill={el.fill}
                                            fontWeight={el.fontWeight} fontFamily={el.fontFamily} fontStyle={el.fontStyle}
                                            draggable
                                            ref={node => { shapeRefs.current[el.id] = node; }}
                                            onClick={() => setSelectedId(el.id)}
                                            onDblClick={(e) => handleTextDblClick(e, el)}
                                            visible={editingId !== el.id}
                                            onDragEnd={(e) => {
                                                setElements(prev => prev.map(it => it.id === el.id ? { ...it, x: e.target.x(), y: e.target.y() } : it));
                                            }}
                                        />
                                    ) : (
                                        <KonvaImage
                                            key={el.id} image={el.image} x={el.x} y={el.y} width={el.width} height={el.height}
                                            draggable={el.id !== 'initial-bg'}
                                            ref={node => { shapeRefs.current[el.id] = node; }}
                                            onClick={() => setSelectedId(el.id)}
                                            onDragEnd={(e) => {
                                                setElements(prev => prev.map(it => it.id === el.id ? { ...it, x: e.target.x(), y: e.target.y() } : it));
                                            }}
                                        />
                                    )
                                )}
                                {selectedId && !editingId && <Transformer ref={trRef} keepRatio={true} />}
                            </Layer>
                        </Stage>

                        {/* 텍스트 편집 오버레이 */}
                        {editingId && (
                            <div className="absolute inset-0 z-[100] bg-black/10">
                                <div style={{ position: 'absolute', top: textareaPos.top, left: textareaPos.left, zIndex: 1001 }}>
                                    <div onMouseDown={handleTextareaDragStart} className="flex items-center justify-between bg-blue-600 text-white text-[10px] px-2 py-1 rounded-t-lg cursor-move">
                                        <span>✥ 드래그하여 이동</span>
                                        <button onClick={handleTextSubmit} className="bg-white text-blue-600 rounded px-1.5 font-bold">확인</button>
                                    </div>
                                    <textarea
                                        ref={textareaRef} autoFocus value={editingValue}
                                        onChange={(e) => setEditingValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSubmit(); }
                                            if (e.key === 'Escape') handleTextSubmit();
                                        }}
                                        style={{
                                            width: textareaPos.width, height: textareaPos.height,
                                            fontSize: `${textStyle.fontSize}px`, color: textStyle.fill,
                                            fontWeight: textStyle.fontWeight, fontFamily: textStyle.fontFamily,
                                            background: 'white', border: '2px solid #2563eb', borderTop: 'none',
                                            outline: 'none', padding: '8px', lineHeight: 1.3, resize: 'none'
                                        }}
                                    />
                                </div>

                                {/* 하단 스타일 툴바 */}
                                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-[#1c1f24] shadow-2xl rounded-2xl px-4 py-3 flex gap-3 items-center border border-gray-200" style={{ zIndex: 1002 }}>
                                    <input type="number" value={textStyle.fontSize} className="w-12 text-center border-b dark:bg-transparent dark:text-white"
                                        onChange={(e) => setTextStyle(s => ({ ...s, fontSize: Number(e.target.value) }))} />
                                    <input type="color" value={textStyle.fill} onChange={(e) => setTextStyle(s => ({ ...s, fill: e.target.value }))} className="w-6 h-6" />
                                    <button onClick={() => setTextStyle(s => ({ ...s, fontWeight: s.fontWeight === 'bold' ? 'normal' : 'bold' }))}
                                        className={`w-8 h-8 rounded ${textStyle.fontWeight === 'bold' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>B</button>
                                    <button onClick={handleTextSubmit} className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold">완료</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 선택 요소 정보 */}
                    {selectedId && !editingId && (
                        <div className="mt-4 bg-white dark:bg-[#1c1f24] rounded-xl px-4 py-2.5 flex items-center justify-between border border-gray-100 dark:border-gray-700">
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">요소가 선택되었습니다.</span>
                            <span className="text-[10px] text-gray-400">더블클릭하여 텍스트 수정</span>
                        </div>
                    )}
                </div>

                {/* 모달 */}
                {modalDataUrl && (
                    <SaveActionModal
                        dataUrl={modalDataUrl}
                        onClose={() => setModalDataUrl(null)}
                        onDownload={handleDownload}
                        onSendToAlbum={handleSendToAlbum}
                    />
                )}
            </div>
        </ResponsiveLayout>
    );
};