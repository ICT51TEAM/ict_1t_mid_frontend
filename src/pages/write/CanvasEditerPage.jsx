import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Text, Image as KonvaImage, Transformer } from 'react-konva';
import { useNavigate } from 'react-router-dom'; // 1. navigate 추가
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Image as ImageIcon, Type, CheckCircle } from 'lucide-react'; // 아이콘 추가
import { useAlert } from '@/context/AlertContext'; // 2. showAlert용 컨텍스트 (경로에 맞춰 수정하세요)

export default function CanvasEditor() {
    const navigate = useNavigate();
    const { showAlert, showConfirm } = useAlert();

    // 상태 관리
    const [elements, setElements] = useState([
        { id: '1', type: 'text', text: '오늘 하루, 나의 스토리를 만들어보세요', x: 50, y: 50 },
    ]);
    const [selectedId, setSelectedId] = useState(null);
    const [stageSize, setStageSize] = useState({ width: 375, height: 500 });
    const [editingId, setEditingId] = useState(null);
    // ✅ Fix 1: editingText → editingValue로 이름 통일 (기존에 editingText로 선언 후 editingValue로 사용하던 불일치 수정)
    const [editingValue, setEditingValue] = useState('');
    const [textareaStyle, setTextareaStyle] = useState({});

    // Ref 설정
    const containerRef = useRef(null);
    const stageRef = useRef(null);
    const trRef = useRef(null);
    const shapeRefs = useRef({});

    // 텍스트 편집 시작
    const handleTextDblClick = (e, el) => {
        // ✅ Fix 2: 더블클릭 오류 수정
        // 기존 코드는 getAbsolutePosition()이 Konva 내부 좌표를 반환하는데,
        // stage의 container() getBoundingClientRect()와 단순 합산하면
        // 스크롤/zoom 상황에서 위치가 틀어지는 문제가 있었음.
        // getClientRect()를 사용해 실제 화면상 절대 좌표를 정확히 계산.
        const textNode = e.target;
        const stage = textNode.getStage();

        // Konva 노드의 실제 화면 위치를 정확히 가져옴 (transform 포함)
        const textRect = textNode.getClientRect();
        const stageContainer = stage.container().getBoundingClientRect();

        setEditingId(el.id);
        // ✅ Fix 1: setEditingText → setEditingValue
        setEditingValue(el.text);

        // 실제 화면상의 위치 계산
        setTextareaStyle({
            position: 'fixed',
            // ✅ Fix 2: stageContainer 기준으로 정확한 위치 계산
            top: `${stageContainer.top + textRect.y}px`,
            left: `${stageContainer.left + textRect.x}px`,
            width: `${textRect.width}px`,
            // 높이는 최소값 보장 + 약간의 여유 확보
            height: `${Math.max(textRect.height + 10, 30)}px`,
            fontSize: `${20 * textNode.scaleY()}px`, // 기본 fontSize 20 기준
            border: '2px solid #3b82f6',
            padding: '0px',
            margin: '0px',
            background: 'white',
            outline: 'none',
            // ✅ Fix 2: zIndex를 충분히 높게 설정해 다른 요소에 가리지 않도록
            zIndex: 1000,
            color: '#333',
            lineHeight: 1.2,
            fontFamily: 'sans-serif',
            resize: 'none',      // 드래그 리사이즈 비활성화 (캔버스와 충돌 방지)
            overflow: 'hidden',  // 스크롤바 숨김
        });
    };

    // 텍스트 수정 완료
    const handleTextSubmit = () => {
        if (!editingId) return;
        // ✅ Fix 1: editingValue를 올바르게 참조 (기존엔 undefined인 editingValue를 참조하던 오류)
        setElements(prev => prev.map(item =>
            item.id === editingId ? { ...item, text: editingValue } : item
        ));
        setEditingId(null);
        setEditingValue('');
    };

    // 반응형 캔버스 크기 계산
    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                const width = containerRef.current.offsetWidth;
                setStageSize({ width: width, height: width * 1.33 });
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 4. Transformer 연결
    useEffect(() => {
        if (selectedId && trRef.current) {
            const selectedNode = shapeRefs.current[selectedId];
            if (selectedNode) {
                trRef.current.nodes([selectedNode]);
                trRef.current.getLayer().batchDraw();
            }
        }
    }, [selectedId]);

    // ---------------------------------------------------------
    // 5. 누락되었던 이미지 업로드 핸들러 (에러 해결 핵심)
    // ---------------------------------------------------------
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const imgElement = new window.Image();
            imgElement.src = reader.result;
            imgElement.onload = () => {
                const newImg = {
                    id: Date.now().toString(),
                    type: 'image',
                    image: imgElement,
                    x: 50, y: 100, width: 200,
                    height: (imgElement.height / imgElement.width) * 200,
                };
                // ✅ Fix 3: setElements에 함수형 업데이트 적용 (클로저 문제 방지)
                setElements(prev => [...prev, newImg]);
                setSelectedId(newImg.id);
            };
        };
        reader.readAsDataURL(file);
    };

    // ---------------------------------------------------------
    // 6. 작업 완료 및 데이터 전달 로직
    // ---------------------------------------------------------
    const handleCanvasFinish = async () => {
        if (!stageRef.current) return;

        // 1. 선택 해제 (Transformer 가이드라인 제거)
        setSelectedId(null);

        // 2. Transformer가 사라진 후 캡처하기 위해 미세한 지연 시간 부여
        setTimeout(() => {
            // 고화질 이미지 추출
            const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2 });

            // 3. 개선된 showConfirm 호출 (객체 형태로 전달)
            showConfirm({
                title: "작업 완료",
                message: "제작한 이미지를 어떻게 할까요?",
                confirmText: "게시물 작성",
                cancelText: "다운로드",
                type: "info",
                onConfirm: () => {
                    // [게시물 작성] 클릭 시 실행
                    const file = dataURLtoFile(dataUrl, `canvas_${Date.now()}.png`);
                    navigate('/create-photo-album', {
                        state: { canvasFile: { url: dataUrl, file } }
                    });
                },
                onCancel: () => {
                    // [다운로드] 클릭 시: 기기에 저장
                    downloadImage(dataUrl);
                }
            });
        }, 50); // setTimeout 괄호 닫기 위치 확인
    };

    const dataURLtoFile = (dataUrl, filename) => {
        const arr = dataUrl.split(','), mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length, u8arr = new Uint8Array(n);
        while (n--) { u8arr[n] = bstr.charCodeAt(n); }
        return new File([u8arr], filename, { type: mime });
    };

    const downloadImage = (dataUrl) => {
        const link = document.createElement('a');
        link.download = `my-canvas-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
        showAlert("이미지가 기기에 저장되었습니다.", "저장 완료", "success");
    };

    const handleStageMouseDown = (e) => {
        if (e.target === e.target.getStage()) {
            setSelectedId(null);
            if (editingId) handleTextSubmit(); // 빈 곳 클릭 시 자동 저장
        }
    };

    return (
        <ResponsiveLayout showTabs={false}>
            <div className="min-h-screen bg-gray-50 dark:bg-[#101215] pb-20">
                {/* 상단 툴바 */}
                <div className="h-16 bg-white dark:bg-[#1c1f24] border-b flex items-center justify-between px-4 sticky top-0 z-50">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setElements(prev => [
                                ...prev,
                                { id: Date.now().toString(), type: 'text', text: '새 문구', x: 50, y: 50 }
                            ])}
                            className="flex items-center gap-2 text-xs font-bold bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-xl"
                        >
                            <Type size={16} /> 텍스트
                        </button>

                        <input type="file" id="img-up" className="hidden" accept="image/*" onChange={handleImageUpload} />
                        <label htmlFor="img-up" className="flex items-center gap-2 text-xs font-bold bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-xl cursor-pointer">
                            <ImageIcon size={16} /> 이미지
                        </label>
                    </div>

                    <button onClick={handleCanvasFinish} className="flex items-center gap-2 text-xs font-bold bg-blue-500 text-white px-4 py-2 rounded-xl">
                        <CheckCircle size={16} /> 완료
                    </button>
                </div>

                <div className="max-w-md mx-auto py-8 px-4 relative">
                    <div ref={containerRef} className="w-full bg-white shadow-2xl rounded-2xl overflow-hidden aspect-[3/4]">
                        <Stage
                            width={stageSize.width}
                            height={stageSize.height}
                            ref={stageRef}
                            onMouseDown={handleStageMouseDown}
                            onTouchStart={handleStageMouseDown}
                            style={{ backgroundColor: '#ffffff' }}
                        >
                            <Layer>
                                {elements.map((el) => {
                                    // ✅ Fix 4: commonProps를 getCommonProps 헬퍼로 분리해 Text/Image 모두 재사용
                                    const commonProps = {
                                        id: el.id,
                                        x: el.x,
                                        y: el.y,
                                        draggable: true,
                                        ref: (node) => (shapeRefs.current[el.id] = node),
                                        onClick: () => setSelectedId(el.id),
                                        onTap: () => setSelectedId(el.id),
                                        onDragEnd: (e) => {
                                            // ✅ Fix 3: 함수형 업데이트로 클로저 문제 방지
                                            setElements(prev => prev.map(item =>
                                                item.id === el.id ? { ...item, x: e.target.x(), y: e.target.y() } : item
                                            ));
                                        },
                                        onTransformEnd: () => {
                                            const node = shapeRefs.current[el.id];
                                            const scaleX = node.scaleX();
                                            const scaleY = node.scaleY();
                                            node.scaleX(1);
                                            node.scaleY(1);
                                            // ✅ Fix 3: 함수형 업데이트로 클로저 문제 방지
                                            setElements(prev => prev.map(item =>
                                                item.id === el.id ? {
                                                    ...item,
                                                    x: node.x(),
                                                    y: node.y(),
                                                    width: Math.max(5, (item.width || 100) * scaleX),
                                                    height: Math.max(5, (item.height || 100) * scaleY)
                                                } : item
                                            ));
                                        }
                                    };

                                    return el.type === 'text' ? (
                                        <Text
                                            key={el.id}
                                            {...commonProps}
                                            text={el.text}
                                            fontSize={20}
                                            fill="#333"
                                            // 편집 중에는 캔버스의 실제 텍스트를 숨김
                                            visible={editingId !== el.id}
                                            onDblClick={(e) => handleTextDblClick(e, el)}
                                            onDblTap={(e) => handleTextDblClick(e, el)}
                                        />
                                    ) : el.type === 'image' ? (
                                        // ✅ Fix 5: 이미지 렌더링 로직 구현 (기존엔 null로 비어있었음)
                                        <KonvaImage
                                            key={el.id}
                                            {...commonProps}
                                            image={el.image}
                                            width={el.width}
                                            height={el.height}
                                        />
                                    ) : null;
                                })}

                                {/* [추가] Transformer (선택된 요소가 있을 때만) */}
                                {selectedId && !editingId && (
                                    <Transformer
                                        ref={trRef}
                                        boundBoxFunc={(oldBox, newBox) => {
                                            newBox.width = Math.max(30, newBox.width);
                                            return newBox;
                                        }}
                                    />
                                )}
                            </Layer>
                        </Stage>
                    </div>

                    {/* [추가] 텍스트 편집용 오버레이 textarea */}
                    {editingId && (
                        <textarea
                            autoFocus
                            // ✅ Fix 1: editingValue state 올바르게 바인딩
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={handleTextSubmit}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) handleTextSubmit();
                            }}
                            style={textareaStyle}
                        />
                    )}
                </div>
            </div>
        </ResponsiveLayout>
    );
}
