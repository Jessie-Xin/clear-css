document.addEventListener("DOMContentLoaded", function () {
    // DOM元素获取
    const htmlInput = document.getElementById("htmlInput");
    const htmlOutput = document.getElementById("htmlOutput");
    const previewContainer = document.getElementById("previewContainer");
    const targetTags = document.getElementById("targetTags");
    const preserveContent = document.getElementById("preserveContent");
    const elementActions = document.querySelector(".element-actions");
    const copyBtn = document.getElementById("copyBtn");
    const copyOutputBtn = document.getElementById("copyOutputBtn");

    // 按钮元素
    const undoBtn = document.getElementById("undoBtn");
    const redoBtn = document.getElementById("redoBtn");
    const deleteTableBtn = document.getElementById("deleteTable");
    const convertToElementBtn = document.getElementById("convertToElement");
    const clearStylesBtn = document.getElementById("clearStyles");
    const deleteElementBtn = document.getElementById("deleteElement");
    const alignLeft = document.getElementById("alignLeft");
    const alignCenter = document.getElementById("alignCenter");
    const alignRight = document.getElementById("alignRight");

    // 复选框元素
    const removeClass = document.getElementById("removeClass");
    const removeStyle = document.getElementById("removeStyle");
    const removeBorder = document.getElementById("removeBorder");
    const removeElementBorder = document.getElementById("removeElementBorder");
    const removeTableWidth = document.getElementById("removeTableWidth");
    const removeElementWidth = document.getElementById("removeElementWidth");
    const removeEmptyElements = document.getElementById("removeEmptyElements");
    const globalRemoveClass = document.getElementById("globalRemoveClass");
    const globalRemoveStyle = document.getElementById("globalRemoveStyle");
    const globalRemoveTable = document.getElementById("globalRemoveTable");

    const elementStyleControls = document.querySelector(".element-style-controls");

    // 状态变量
    let selectedElements = [];
    let operationHistory = [];
    let currentHistoryIndex = -1;

    // 历史记录相关函数
    function saveState() {
        const state = getPreviewContent();
        // 删除之后的历史记录
        operationHistory = operationHistory.slice(0, currentHistoryIndex + 1);
        operationHistory.push(state);
        currentHistoryIndex = operationHistory.length - 1;

        // 更新撤销/前进按钮状态
        updateHistoryButtonState();
    }

    function resetHistoryToCurrent() {
        operationHistory = [getPreviewContent()];
        currentHistoryIndex = 0;
        updateHistoryButtonState();
    }

    function undo() {
        if (currentHistoryIndex > 0) {
            currentHistoryIndex--;
            applyState(operationHistory[currentHistoryIndex]);
            updateHistoryButtonState();
        }
    }

    function redo() {
        if (currentHistoryIndex < operationHistory.length - 1) {
            currentHistoryIndex++;
            applyState(operationHistory[currentHistoryIndex]);
            updateHistoryButtonState();
        }
    }

    function applyState(state) {
        previewContainer.innerHTML = state;
        previewContainer.appendChild(copyBtn);
        syncOutputFromPreview();
    }

    function updateHistoryButtonState() {
        undoBtn.disabled = currentHistoryIndex <= 0;
        redoBtn.disabled = currentHistoryIndex >= operationHistory.length - 1;
    }

    // 添加撤销和前进按钮事件监听
    undoBtn.addEventListener("click", undo);
    redoBtn.addEventListener("click", redo);

    // 添加撤销和前进快捷键
    document.addEventListener("keydown", function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === "z") {
            e.preventDefault();
            if (e.shiftKey) {
                redo();
            } else {
                undo();
            }
        }
    });

    // 元素高亮相关函数
    function addHighlight(element) {
        element.classList.add("selected-highlight");
    }

    function removeHighlight(element) {
        element.classList.remove("selected-highlight");
    }

    function clearAllHighlights() {
        selectedElements.forEach((element) => removeHighlight(element));
        selectedElements = [];
    }

    function removeInlineStyles(root) {
        if (root.hasAttribute && root.hasAttribute("style")) {
            root.removeAttribute("style");
        }
        root.querySelectorAll("[style]").forEach((element) => {
            element.removeAttribute("style");
        });
    }

    function unwrapEscapedHtml(html) {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = html;
        const textContent = wrapper.textContent.trim();
        const hasEscapedTags = html.includes("&lt;") || html.includes("&gt;");
        const looksLikeHtml = /<\/?[a-z][\w:-]*(\s|>|\/)/i.test(textContent);

        return hasEscapedTags && looksLikeHtml ? textContent : html;
    }

    function removeEmptyElementsFrom(root) {
        const ignoredTags = new Set(["table", "thead", "tbody", "tfoot", "tr", "td", "th", "colgroup", "col", "br", "hr", "img", "input", "textarea", "button"]);
        const elements = Array.from(root.querySelectorAll("*")).reverse();

        elements.forEach((element) => {
            const tagName = element.tagName.toLowerCase();
            const hasContent = element.textContent.replace(/\u00a0/g, "").trim() !== "";
            const hasMeaningfulChild = element.querySelector("img, input, textarea, button, table, hr, br");

            if (!ignoredTags.has(tagName) && !hasContent && !hasMeaningfulChild) {
                element.remove();
            }
        });
    }

    function escapeText(text) {
        const span = document.createElement("span");
        span.textContent = text;
        return span.innerHTML.replace(/\u00a0/g, "&nbsp;");
    }

    function formatAttributes(element) {
        return Array.from(element.attributes)
            .map((attr) => `${attr.name}="${attr.value.replace(/"/g, "&quot;")}"`)
            .join(" ");
    }

    function formatHtml(html) {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = html;
        const voidTags = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
        const lines = [];

        function formatNode(node, depth) {
            const indent = "  ".repeat(depth);

            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent.replace(/\s+/g, " ").trim();
                if (text) {
                    lines.push(`${indent}${escapeText(text)}`);
                }
                return;
            }

            if (node.nodeType !== Node.ELEMENT_NODE) {
                return;
            }

            const tagName = node.tagName.toLowerCase();
            const attributes = formatAttributes(node);
            const openTag = attributes ? `<${tagName} ${attributes}>` : `<${tagName}>`;

            if (voidTags.has(tagName)) {
                lines.push(`${indent}${openTag}`);
                return;
            }

            lines.push(`${indent}${openTag}`);
            Array.from(node.childNodes).forEach((child) => formatNode(child, depth + 1));
            lines.push(`${indent}</${tagName}>`);
        }

        Array.from(wrapper.childNodes).forEach((node) => formatNode(node, 0));
        return lines.join("\n");
    }

    function setPreviewHtml(html, shouldSyncOutput = true) {
        previewContainer.innerHTML = html;
        previewContainer.appendChild(copyBtn);
        if (shouldSyncOutput) {
            syncOutputFromPreview();
        }
    }

    function syncOutputFromPreview() {
        htmlOutput.value = formatHtml(getPreviewContent());
    }

    // 元素选择与高亮
    previewContainer.addEventListener("mouseover", function (e) {
        const hoveredElement = e.target;
        if (hoveredElement === copyBtn) return;

        e.preventDefault();
        e.stopPropagation();

        if (!selectedElements.includes(hoveredElement) && hoveredElement !== previewContainer) {
            addHighlight(hoveredElement);
        }
    });

    previewContainer.addEventListener("mouseout", function (e) {
        const hoveredElement = e.target;
        if (hoveredElement === copyBtn) return;

        if (!selectedElements.includes(hoveredElement) && hoveredElement !== previewContainer) {
            removeHighlight(hoveredElement);
        }
    });

    previewContainer.addEventListener("click", function (e) {
        const clickedElement = e.target;
        if (clickedElement === copyBtn || clickedElement === previewContainer) return;

        e.preventDefault();
        e.stopPropagation();

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

        elementActions.style.display = selectedElements.length > 0 ? "block" : "none";
    });

    // 删除表格按钮
    deleteTableBtn.addEventListener("click", function () {
        if (selectedElements.length > 0) {
            saveState();
            const tables = Array.from(new Set(selectedElements.map((element) => element.closest("table")).filter(Boolean)));
            const convertedTables = tables.map((table) => {
                const tableContent = convertTableToDiv(table);
                addHighlight(tableContent);
                return tableContent;
            });
            selectedElements = convertedTables;
            elementActions.style.display = selectedElements.length > 0 ? "block" : "none";
            syncOutputFromPreview();
            saveState();
        }
    });

    // 转换元素按钮
    convertToElementBtn.addEventListener("click", function () {
        if (selectedElements.length > 0) {
            saveState();
            selectedElements.forEach((element, index) => {
                const newElement = document.createElement("div");
                if (preserveContent.checked) {
                    newElement.innerHTML = element.innerHTML;
                } else {
                    newElement.textContent = element.textContent;
                }
                element.parentNode.replaceChild(newElement, element);
                selectedElements[index] = newElement;
                addHighlight(newElement);
            });
            syncOutputFromPreview();
            saveState();
        }
    });

    // 清除样式按钮
    clearStylesBtn.addEventListener("click", function () {
        if (selectedElements.length > 0) {
            saveState();
            selectedElements.forEach((element) => {
                if (removeClass.checked) {
                    element.removeAttribute("class");
                }
                if (removeStyle.checked) {
                    element.removeAttribute("style");
                }
                if (element.tagName.toLowerCase() === "table") {
                    // 处理表格宽度
                    if (removeElementWidth.checked) {
                        element.removeAttribute("width");
                        element.style.width = "";
                    }

                    // 处理表格边框
                    if (removeElementBorder.checked) {
                        element.removeAttribute("border");
                        element.style.borderCollapse = "collapse";
                        element.style.border = "none";

                        // 移除所有单元格边框
                        const cells = element.querySelectorAll("td, th");
                        for (let cell of cells) {
                            cell.style.border = "none";
                        }
                    } else {
                        // 确保表格有边框
                        if (!element.hasAttribute("border") && element.style.border === "") {
                            element.setAttribute("border", "1");
                            element.style.borderCollapse = "collapse";
                        }

                        // 确保所有单元格有边框
                        const cells = element.querySelectorAll("td, th");
                        for (let cell of cells) {
                            if (cell.style.border === "") {
                                cell.style.border = "1px solid #ddd";
                            }
                        }
                    }
                }
                if (removeStyle.checked) {
                    removeInlineStyles(element);
                }
                addHighlight(element);
            });
            syncOutputFromPreview();
            saveState();
        }
    });

    // 删除元素按钮
    deleteElementBtn.addEventListener("click", function () {
        if (selectedElements.length > 0) {
            saveState();
            selectedElements.forEach((element) => {
                element.remove();
            });
            selectedElements = [];
            elementActions.style.display = "none";
            syncOutputFromPreview();
            saveState();
        }
    });

    // 文本对齐按钮
    alignLeft.addEventListener("click", function () {
        if (selectedElements.length > 0) {
            saveState();
            selectedElements.forEach((element) => {
                element.style.textAlign = "left";
                addHighlight(element);
            });
            syncOutputFromPreview();
            saveState();
        }
    });

    alignCenter.addEventListener("click", function () {
        if (selectedElements.length > 0) {
            saveState();
            selectedElements.forEach((element) => {
                element.style.textAlign = "center";
                addHighlight(element);
            });
            syncOutputFromPreview();
            saveState();
        }
    });

    alignRight.addEventListener("click", function () {
        if (selectedElements.length > 0) {
            saveState();
            selectedElements.forEach((element) => {
                element.style.textAlign = "right";
                addHighlight(element);
            });
            syncOutputFromPreview();
            saveState();
        }
    });

    // 处理HTML函数
    function processHtml(html) {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = unwrapEscapedHtml(html);

        // 根据用户选择处理HTML元素
        if (globalRemoveClass.checked || globalRemoveStyle.checked || removeBorder.checked || removeTableWidth.checked || globalRemoveTable.checked) {
            const elements = Array.from(tempDiv.getElementsByTagName("*"));

            for (let i = 0; i < elements.length; i++) {
                const element = elements[i];

                if (globalRemoveClass.checked) {
                    element.removeAttribute("class");
                }

                if (globalRemoveStyle.checked) {
                    element.removeAttribute("style");
                }

                if (element.tagName.toLowerCase() === "table") {
                    if (globalRemoveTable.checked) {
                        convertTableToDiv(element);
                    } else {
                        // 处理表格宽度
                        if (removeTableWidth.checked) {
                            element.removeAttribute("width");
                            element.style.width = "";
                        }

                        // 处理表格边框
                        if (removeBorder.checked) {
                            element.removeAttribute("border");
                            element.style.borderCollapse = "collapse";
                            element.style.border = "none";

                            // 移除所有单元格边框
                            const cells = element.querySelectorAll("td, th");
                            for (let j = 0; j < cells.length; j++) {
                                cells[j].style.border = "none";
                            }
                        } else {
                            // 确保表格有边框
                            if (!element.hasAttribute("border") && element.style.border === "") {
                                element.setAttribute("border", "1");
                                element.style.borderCollapse = "collapse";
                            }

                            // 确保所有单元格有边框
                            const cells = element.querySelectorAll("td, th");
                            for (let j = 0; j < cells.length; j++) {
                                if (cells[j].style.border === "") {
                                    cells[j].style.border = "1px solid #ddd";
                                }
                            }
                        }
                    }
                }
            }
        }

        if (globalRemoveStyle.checked) {
            removeInlineStyles(tempDiv);
        }

        if (removeEmptyElements.checked) {
            removeEmptyElementsFrom(tempDiv);
        }

        return tempDiv.innerHTML;
    }

    // 表格转换为div的辅助函数
    function convertTableToDiv(table) {
        const tableContent = document.createElement("div");
        const rows = table.getElementsByTagName("tr");

        Array.from(rows).forEach((row) => {
            const rowDiv = document.createElement("div");
            const cells = row.children;

            Array.from(cells).forEach((cell) => {
                const cellDiv = document.createElement("span");
                cellDiv.innerHTML = cell.innerHTML;
                rowDiv.appendChild(cellDiv);
            });

            tableContent.appendChild(rowDiv);
        });

        table.parentNode.replaceChild(tableContent, table);
        return tableContent;
    }

    // 监听输入变化
    htmlInput.addEventListener("input", function () {
        const processedHtml = processHtml(htmlInput.value);
        setPreviewHtml(processedHtml);
        resetHistoryToCurrent();
    });

    // 添加粘贴事件处理函数
    function handlePasteEvent(e) {
        e.preventDefault();
        const clipboardData = e.clipboardData || window.clipboardData;
        let pastedData;

        // 尝试获取HTML格式
        if (clipboardData.getData("text/html")) {
            pastedData = clipboardData.getData("text/html");
        } else {
            pastedData = clipboardData.getData("text/plain");
        }

        // 将粘贴的内容插入到当前光标位置
        const startPos = this.selectionStart;
        const endPos = this.selectionEnd;
        const textBefore = this.value.substring(0, startPos);
        const textAfter = this.value.substring(endPos);

        this.value = textBefore + pastedData + textAfter;
        // 更新预览
        const processedHtml = processHtml(this.value);
        setPreviewHtml(processedHtml);

        // 如果是表格内容，确保表格显示边框
        if (pastedData.includes("<table") && !removeBorder.checked) {
            ensureTableBorders();
        }

        if (globalRemoveStyle.checked) {
            removeInlineStyles(previewContainer);
        }
        syncOutputFromPreview();
        resetHistoryToCurrent();
    }

    // 确保所有表格有边框的函数
    function ensureTableBorders() {
        const tables = previewContainer.querySelectorAll("table");
        tables.forEach((table) => {
            if (!table.hasAttribute("border") && table.style.border === "") {
                table.setAttribute("border", "1");
                table.style.borderCollapse = "collapse";
            }

            const cells = table.querySelectorAll("td, th");
            cells.forEach((cell) => {
                if (cell.style.border === "") {
                    cell.style.border = "1px solid #ddd";
                }
            });
        });
    }

    // 监听粘贴事件
    htmlInput.addEventListener("paste", handlePasteEvent);

    // 监听全局设置变化
    const settingInputs = [globalRemoveClass, globalRemoveStyle, removeBorder, removeTableWidth, removeEmptyElements, globalRemoveTable, targetTags, preserveContent];

    settingInputs.forEach((input) => {
        const eventType = input.type === "text" ? "input" : "change";
        input.addEventListener(eventType, function () {
            if (htmlInput.value) {
                const processedHtml = processHtml(htmlInput.value);
                setPreviewHtml(processedHtml);
                resetHistoryToCurrent();
            }
        });
    });

    // 点击空白区域取消选择
    document.addEventListener("click", function (e) {
        if (!e.target.closest(".preview-section") && !e.target.closest(".element-actions")) {
            clearAllHighlights();
            elementActions.style.display = "none";
        }
    });

    // 初始化时设置预览区域可编辑
    previewContainer.contentEditable = true;

    // 监听预览区域的输入事件
    previewContainer.addEventListener("input", function (e) {
        if (e.target !== copyBtn) {
            saveState();
            syncOutputFromPreview();
        }
    });

    htmlOutput.addEventListener("input", function () {
        setPreviewHtml(htmlOutput.value, false);
        resetHistoryToCurrent();
    });

    function getPreviewContent() {
        // 临时创建一个容器来获取HTML，避免包含复制按钮
        const tempContainer = document.createElement("div");
        tempContainer.innerHTML = previewContainer.innerHTML;

        // 移除可能存在的复制按钮
        const tempCopyBtn = tempContainer.querySelector("#copyBtn");
        if (tempCopyBtn) {
            tempCopyBtn.remove();
        }

        tempContainer.querySelectorAll(".selected-highlight").forEach((element) => {
            element.classList.remove("selected-highlight");
            if (element.getAttribute("class") === "") {
                element.removeAttribute("class");
            }
        });

        if (globalRemoveStyle.checked) {
            removeInlineStyles(tempContainer);
        }

        return tempContainer.innerHTML.trim();
    }

    // 添加复制按钮事件监听
    copyBtn.addEventListener("click", function (e) {
        e.stopPropagation(); // 阻止事件冒泡到previewContainer

        const content = getPreviewContent();

        if (!content) {
            console.warn("复制失败: 预览内容为空");
            return;
        }

        // 尝试使用现代API复制
        if (navigator.clipboard && window.ClipboardItem) {
            const clipboardItem = new ClipboardItem({
                "text/html": new Blob([content], {type: "text/html;charset=utf-8"}),
                "text/plain": new Blob([content], {type: "text/plain;charset=utf-8"}),
            });
            navigator.clipboard
                .write([clipboardItem])
                .then(() => {
                    showCopySuccess(copyBtn);
                })
                .catch((err) => {
                    console.error("复制失败:", err);
                    fallbackCopy(content, copyBtn);
                });
        } else {
            fallbackCopy(content, copyBtn);
        }
    });

    copyOutputBtn.addEventListener("click", function () {
        const content = htmlOutput.value.trim();

        if (!content) {
            console.warn("复制失败: 修改后的HTML为空");
            return;
        }

        fallbackCopy(content, copyOutputBtn);
    });

    // 复制成功反馈
    function showCopySuccess(button) {
        const originalText = button.textContent;
        button.textContent = "复制成功！";
        setTimeout(() => {
            button.textContent = originalText;
        }, 2000);
    }

    // 后备复制方法
    function fallbackCopy(content, button) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard
                .writeText(content)
                .then(() => {
                    showCopySuccess(button);
                })
                .catch((err) => {
                    console.error("文本复制失败，使用后备方案:", err);
                    copyWithSelection(content, button);
                });
            return;
        }

        copyWithSelection(content, button);
    }

    function copyWithSelection(content, button) {
        const textarea = document.createElement("textarea");
        textarea.value = content;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        try {
            document.execCommand("copy");
            showCopySuccess(button);
        } catch (err) {
            console.error("复制失败:", err);
        }

        document.body.removeChild(textarea);
    }

    // 初始化
    saveState();
    updateHistoryButtonState();
});
