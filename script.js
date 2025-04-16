document.addEventListener("DOMContentLoaded", function () {
    const htmlInput = document.getElementById("htmlInput");
    const previewContainer = document.getElementById("previewContainer");
    const targetTags = document.getElementById("targetTags");
    const preserveContent = document.getElementById("preserveContent");
    const elementActions = document.querySelector(".element-actions");
    const deleteTableBtn = document.getElementById("deleteTable");
    const convertToElementBtn = document.getElementById("convertToElement");
    const clearStylesBtn = document.getElementById("clearStyles");
    const deleteElementBtn = document.getElementById("deleteElement");
    const copyBtn = document.createElement("button");
    copyBtn.textContent = "复制预览内容";
    copyBtn.style.position = "absolute";
    copyBtn.style.right = "20px";
    copyBtn.style.top = "10px";

    const previewWrapper = document.createElement("div");
    previewWrapper.style.position = "relative";
    previewContainer.parentNode.insertBefore(previewWrapper, previewContainer);
    previewWrapper.appendChild(previewContainer);
    previewWrapper.appendChild(copyBtn);
    const removeClass = document.getElementById("removeClass");
    const removeStyle = document.getElementById("removeStyle");
    const removeBorder = document.getElementById("removeBorder");
    const removeElementBorder = document.getElementById("removeElementBorder");
    const removeTableWidth = document.getElementById("removeTableWidth");
    const removeElementWidth = document.getElementById("removeElementWidth");
    const globalRemoveClass = document.getElementById("globalRemoveClass");
    const globalRemoveStyle = document.getElementById("globalRemoveStyle");
    const globalRemoveTable = document.getElementById("globalRemoveTable");
    const alignLeft = document.getElementById("alignLeft");
    const alignCenter = document.getElementById("alignCenter");
    const alignRight = document.getElementById("alignRight");
    const elementStyleControls = document.querySelector(".element-style-controls");
    let selectedElements = [];
    let operationHistory = [];
    let currentHistoryIndex = -1;

    function saveState() {
        const state = previewContainer.innerHTML;
        currentHistoryIndex++;
        operationHistory = operationHistory.slice(0, currentHistoryIndex);
        operationHistory.push(state);
        htmlInput.value = state;
    }

    function undo() {
        if (currentHistoryIndex > 0) {
            currentHistoryIndex--;
            const state = operationHistory[currentHistoryIndex];
            previewContainer.innerHTML = state;
            htmlInput.value = state;
        }
    }

    function redo() {
        if (currentHistoryIndex < operationHistory.length - 1) {
            currentHistoryIndex++;
            const state = operationHistory[currentHistoryIndex];
            previewContainer.innerHTML = state;
            htmlInput.value = state;
        }
    }

    // 添加撤销和前进快捷键
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                redo();
            } else {
                undo();
            }
        }
    });

    // 添加撤销和前进按钮事件监听
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');

    undoBtn.addEventListener('click', undo);
    redoBtn.addEventListener('click', redo);

    function addHighlight(element) {
        element.style.outline = '2px solid #007bff';
        element.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
    }

    function removeHighlight(element) {
        element.style.outline = '';
        element.style.backgroundColor = '';
    }

    function clearAllHighlights() {
        selectedElements.forEach(element => removeHighlight(element));
        selectedElements = [];
    }

    previewContainer.addEventListener('mouseover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const hoveredElement = e.target;
        if (!selectedElements.includes(hoveredElement) && hoveredElement !== previewContainer) {
            addHighlight(hoveredElement);
        }
    });

    previewContainer.addEventListener('mouseout', function(e) {
        if (!selectedElements.includes(e.target) && e.target !== previewContainer) {
            removeHighlight(e.target);
        }
    });

    previewContainer.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const clickedElement = e.target;
        
        if (clickedElement === previewContainer) {
            return;
        }

        if (!e.shiftKey) {
            clearAllHighlights();
        }
        
        if (!selectedElements.includes(clickedElement)) {
            selectedElements.push(clickedElement);
            addHighlight(clickedElement);
        } else {
            const index = selectedElements.indexOf(clickedElement);
            selectedElements.splice(index, 1);
            removeHighlight(clickedElement);
        }
        
        elementActions.style.display = selectedElements.length > 0 ? 'block' : 'none';
    });

    deleteTableBtn.addEventListener('click', function() {
        if (selectedElements.length > 0) {
            saveState();
            selectedElements.forEach(element => {
                if (element.closest('table')) {
                    const table = element.closest('table');
                    const rows = table.getElementsByTagName('tr');
                    Array.from(rows).forEach(row => {
                        const newDiv = document.createElement('div');
                        newDiv.innerHTML = row.innerHTML;
                        row.parentNode.replaceChild(newDiv, row);
                    });
                    const index = selectedElements.indexOf(element);
                    selectedElements[index] = table;
                    addHighlight(table);
                }
            });
        }
    });

    convertToElementBtn.addEventListener('click', function() {
        if (selectedElements.length > 0) {
            saveState();
            selectedElements.forEach((element, index) => {
                const newElement = document.createElement('div');
                if (preserveContent.checked) {
                    newElement.innerHTML = element.innerHTML;
                } else {
                    newElement.textContent = element.textContent;
                }
                element.parentNode.replaceChild(newElement, element);
                selectedElements[index] = newElement;
                addHighlight(newElement);
            });
        }
    });

    clearStylesBtn.addEventListener('click', function() {
        if (selectedElements.length > 0) {
            saveState();
            selectedElements.forEach(element => {
                if (removeClass.checked) {
                    element.removeAttribute('class');
                }
                if (removeStyle.checked) {
                    element.removeAttribute('style');
                }
                if (element.tagName.toLowerCase() === 'table') {
                    if (removeElementBorder.checked) {
                        element.removeAttribute('border');
                        element.style.borderCollapse = 'collapse';
                        element.style.border = 'none';
                    }
                    if (removeElementWidth.checked) {
                        element.removeAttribute('width');
                        element.style.width = '';
                    }
                }
                addHighlight(element);
            });
            elementStyleControls.style.display = 'block';
        }
    });

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.preview-section') && !e.target.closest('.element-actions')) {
            clearAllHighlights();
            elementActions.style.display = 'none';
            elementStyleControls.style.display = 'none';
        }
    });

    deleteElementBtn.addEventListener('click', function() {
        if (selectedElements.length > 0) {
            saveState();
            selectedElements.forEach(element => {
                element.remove();
            });
            selectedElements = [];
            elementActions.style.display = 'none';
        }
    });

    // 文本对齐方式控制
    alignLeft.addEventListener('click', function() {
        if (selectedElements.length > 0) {
            saveState();
            selectedElements.forEach(element => {
                element.style.textAlign = 'left';
                addHighlight(element);
            });
        }
    });

    alignCenter.addEventListener('click', function() {
        if (selectedElements.length > 0) {
            saveState();
            selectedElements.forEach(element => {
                element.style.textAlign = 'center';
                addHighlight(element);
            });
        }
    });

    alignRight.addEventListener('click', function() {
        if (selectedElements.length > 0) {
            saveState();
            selectedElements.forEach(element => {
                element.style.textAlign = 'right';
                addHighlight(element);
            });
        }
    });


    function processHtml(html) {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = html;
    
        // 根据用户选择处理HTML元素
        if (globalRemoveClass.checked || globalRemoveStyle.checked || removeBorder.checked || removeTableWidth.checked || globalRemoveTable.checked) {
            const elements = tempDiv.getElementsByTagName("*");
            for (let element of elements) {
                if (globalRemoveClass.checked) {
                    element.removeAttribute('class');
                }
                if (globalRemoveStyle.checked) {
                    element.removeAttribute('style');
                }
                if (element.tagName.toLowerCase() === 'table' && globalRemoveTable.checked) {
                    // 先处理所有的tr标签
                    const rows = element.getElementsByTagName('tr');
                    Array.from(rows).forEach(row => {
                        const cells = row.children;
                        const newDiv = document.createElement('div');
                        Array.from(cells).forEach(cell => {
                            newDiv.innerHTML += cell.innerHTML;
                        });
                        row.parentNode.replaceChild(newDiv, row);
                    });
                    // 然后移除表格本身
                    const tableContent = element.innerHTML;
                    const tableWrapper = document.createElement('div');
                    tableWrapper.innerHTML = tableContent;
                    element.parentNode.replaceChild(tableWrapper, element);
                } else if (element.tagName.toLowerCase() === 'table') {
                    if (removeBorder.checked) {
                        element.removeAttribute('border');
                        element.style.borderCollapse = 'collapse';
                        element.style.border = 'none';
                    }
                    if (removeTableWidth.checked) {
                        element.removeAttribute('width');
                        element.style.width = '';
                    }
                }
            }
        }
    
        return tempDiv.innerHTML;
    }

    // 监听输入变化和粘贴事件
    htmlInput.addEventListener("input", function () {
        previewContainer.innerHTML = processHtml(htmlInput.value);
    });

    htmlInput.addEventListener("paste", function (e) {
        e.preventDefault();
        const clipboardData = e.clipboardData || window.clipboardData;
        const pastedData = clipboardData.getData("text/html") || clipboardData.getData("text/plain");

        // 将粘贴的内容插入到当前光标位置
        const startPos = this.selectionStart;
        const endPos = this.selectionEnd;
        const textBefore = this.value.substring(0, startPos);
        const textAfter = this.value.substring(endPos);

        this.value = textBefore + pastedData + textAfter;
        // 更新预览
        previewContainer.innerHTML = processHtml(this.value);
    });

    // 监听所有复选框和输入框的变化事件
    [globalRemoveClass, globalRemoveStyle, removeBorder, removeTableWidth, globalRemoveTable, targetTags, preserveContent].forEach((input) => {
        const eventType = input.type === "text" ? "input" : "change";
        input.addEventListener(eventType, function () {
            if (htmlInput.value) {
                previewContainer.innerHTML = processHtml(htmlInput.value);
            }
        });
    });

    // 初始化时设置预览区域可编辑
    previewContainer.contentEditable = true;

    // 初始化时保存初始状态
    saveState();

    // 监听预览区域的输入事件
    previewContainer.addEventListener('input', function() {
        saveState();
    });

    // 添加复制按钮事件监听
    copyBtn.addEventListener('click', function() {
        const content = previewContainer.innerHTML;
        const blob = new Blob([content], { type: 'text/html' });
        const clipboardItem = new ClipboardItem({ 'text/html': blob });
        navigator.clipboard.write([clipboardItem]).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = "复制成功！";
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        }).catch(err => {
            console.error('复制失败:', err);
        });
    });
});
