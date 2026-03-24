const { jsPDF } = window.jspdf;

window.onload = () => {
    setTimeout(() => {
        const loader = document.getElementById('initialLoader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 800);
        }
    }, 3000);
};

const layoutUpload = document.getElementById('layoutUpload'), layoutImage = document.getElementById('layoutImage'),
    editorLayer = document.getElementById('editor-layer'), canvasWrapper = document.getElementById('canvas-wrapper'),
    resultsContainer = document.getElementById('results-container'), btnStartProcess = document.getElementById('btnStartProcess'),
    nameListInput = document.getElementById('nameList'), sidebarEditor = document.getElementById('sidebarEditor'),
    sidebarExport = document.getElementById('sidebarExport'), btnBackToEditor = document.getElementById('btnBackToEditor'),
    btnDropdownToggle = document.getElementById('btnDropdownToggle'), dropdownContent = document.getElementById('dropdownContent'),
    emptyState = document.getElementById('emptyState'), mainViewport = document.getElementById('mainViewport'),
    exportTarget = document.getElementById('export-target'), zoomContainer = document.getElementById('zoom-container');

let activeElement = null, isDragging = false, isResizing = false, generatedCanvases = [];
let dragOffset = { x: 0, y: 0 }, originalImgWidth = 0, originalImgHeight = 0;
let zoomLevel = 1.0;

function addTextPlaceholder(text = "New Placeholder", x = 0, y = 50, width = null) {
    if (!text) return;
    const el = document.createElement('div');
    el.className = 'draggable-text';
    el.contentEditable = "true";
    el.innerText = text;

    const layoutW = editorLayer.offsetWidth;
    const layoutH = editorLayer.offsetHeight;

    // Full width — edge to edge, matching the certificate line
    const defaultWidth = width || layoutW;

    el.style.left = (layoutW * (x / 100)) + 'px';
    el.style.top = (layoutH * (y / 100)) + 'px'; // No offset — truth value used by export too
    el.style.width = defaultWidth + 'px';
    el.style.fontSize = document.getElementById('fontSize').value + 'px';
    el.style.fontFamily = document.getElementById('fontFamily').value;
    el.style.textAlign = 'center'; // Set center as default
    el.style.color = document.getElementById('textColor').value;
    el.style.fontWeight = 'normal';
    el.style.fontStyle = 'normal';

    // Update toolbar to match the new default
    document.getElementById('textAlign').value = 'center';

    const resizer = document.createElement('div');
    resizer.className = 'resizer';
    el.appendChild(resizer);
    el.onmousedown = (e) => {
        if (e.target.className === 'resizer') startResize(e, el);
        else startDrag(e, el);
    };
    editorLayer.appendChild(el);
    setActive(el);
}

function startDrag(e, el) {
    if (document.activeElement === el && e.target === el) return;
    setActive(el); isDragging = true;
    const rect = el.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left; dragOffset.y = e.clientY - rect.top;
    window.onmousemove = (ev) => {
        const canvasRect = editorLayer.getBoundingClientRect();
        const dx = (ev.clientX - dragOffset.x - canvasRect.left) / zoomLevel;
        const dy = (ev.clientY - dragOffset.y - canvasRect.top) / zoomLevel;
        el.style.left = `${dx}px`;
        el.style.top = `${dy}px`;
    };
    window.onmouseup = () => { isDragging = false; window.onmousemove = null; };
}

function startResize(e, el) {
    e.preventDefault(); isResizing = true;
    const startWidth = el.offsetWidth, startX = e.clientX;
    window.onmousemove = (ev) => {
        const dx = (ev.clientX - startX) / zoomLevel;
        el.style.width = Math.max(50, startWidth + dx) + 'px';
    };
    window.onmouseup = () => { isResizing = false; window.onmousemove = null; };
}

function setActive(el) {
    if (activeElement) activeElement.classList.remove('active-element');
    activeElement = el;
    if (el) {
        el.classList.add('active-element');
        document.getElementById('fontSize').value = parseInt(el.style.fontSize);
        document.getElementById('fontFamily').value = el.style.fontFamily;
        document.getElementById('textAlign').value = el.style.textAlign;
        document.getElementById('textColor').value = el.style.color;

        document.getElementById('toggleBold').classList.toggle('active', el.style.fontWeight === 'bold');
        document.getElementById('toggleItalic').classList.toggle('active', el.style.fontStyle === 'italic');
    }
}

layoutUpload.onchange = (e) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
            originalImgWidth = img.width; originalImgHeight = img.height;
            const scale = Math.min((mainViewport.offsetWidth - 100) / img.width, (mainViewport.offsetHeight - 100) / img.height, 1);
            canvasWrapper.style.width = `${img.width * scale}px`; canvasWrapper.style.height = `${img.height * scale}px`;
            layoutImage.src = ev.target.result; layoutImage.classList.remove('hidden'); emptyState.classList.add('hidden');
            zoomLevel = 1.0; updateZoom();
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(e.target.files[0]);
};

function updateZoom() {
    const inReview = !resultsContainer.classList.contains('hidden');
    if (inReview) {
        // Scale each preview image in the results view
        document.querySelectorAll('.result-preview').forEach(img => {
            img.style.transform = `scale(${zoomLevel})`;
            img.style.transformOrigin = 'top center';
        });
    } else {
        zoomContainer.style.transform = `scale(${zoomLevel})`;
    }
    document.getElementById('zoomDisplay').innerText = `${Math.round(zoomLevel * 100)}%`;
}

document.getElementById('btnZoomIn').onclick = () => {
    if (zoomLevel < 3.0) { zoomLevel += 0.1; updateZoom(); }
};
document.getElementById('btnZoomOut').onclick = () => {
    if (zoomLevel > 0.2) { zoomLevel -= 0.1; updateZoom(); }
};

document.getElementById('addPlaceholder').onclick = () => addTextPlaceholder('[NAME_PLACEHOLDER]');
document.getElementById('fontSize').oninput = (e) => activeElement && (activeElement.style.fontSize = e.target.value + 'px');
document.getElementById('fontFamily').onchange = (e) => activeElement && (activeElement.style.fontFamily = e.target.value);
document.getElementById('textAlign').onchange = (e) => activeElement && (activeElement.style.textAlign = e.target.value);
document.getElementById('textColor').oninput = (e) => activeElement && (activeElement.style.color = e.target.value);

document.getElementById('toggleBold').onclick = () => {
    if (!activeElement) return;
    const isBold = activeElement.style.fontWeight === 'bold';
    activeElement.style.fontWeight = isBold ? 'normal' : 'bold';
    document.getElementById('toggleBold').classList.toggle('active', !isBold);
};

document.getElementById('toggleItalic').onclick = () => {
    if (!activeElement) return;
    const isItalic = activeElement.style.fontStyle === 'italic';
    activeElement.style.fontStyle = isItalic ? 'normal' : 'italic';
    document.getElementById('toggleItalic').classList.toggle('active', !isItalic);
};

btnStartProcess.onclick = async () => {
    const names = nameListInput.value.split('\n').filter(n => n.trim() !== "");
    if (!layoutImage.src || names.length === 0) return;

    const prevZoom = zoomLevel;
    zoomLevel = 1.0;
    updateZoom();

    setActive(null);
    document.getElementById('exportOverlay').style.display = 'flex';

    // Start a 3-second timer and the generation process simultaneously
    const timerPromise = new Promise(resolve => setTimeout(resolve, 3000));

    const headerInfo = resultsContainer.firstElementChild.cloneNode(true);
    resultsContainer.innerHTML = '';
    resultsContainer.appendChild(headerInfo);

    generatedCanvases = [];
    const placeholders = Array.from(document.querySelectorAll('.draggable-text'));

    const exportBox = document.createElement('div');
    exportBox.style.width = originalImgWidth + 'px'; exportBox.style.height = originalImgHeight + 'px';
    exportBox.style.position = 'relative'; exportBox.style.backgroundColor = 'white';
    const exImg = new Image(); exImg.src = layoutImage.src; exImg.style.width = '100%'; exImg.style.height = '100%';
    exportBox.appendChild(exImg);
    exportTarget.appendChild(exportBox);

    // Generation process
    for (let i = 0; i < names.length; i++) {
        const progress = Math.round(((i + 1) / names.length) * 100);
        document.getElementById('progressText').innerText = `${progress}%`;

        exportBox.querySelectorAll('.export-node').forEach(n => n.remove());

        // Use the rendered canvas size (unaffected by CSS zoom transform) as reference
        const cw = canvasWrapper.offsetWidth;
        const ch = canvasWrapper.offsetHeight;
        const scaleX = originalImgWidth / cw;
        const scaleY = originalImgHeight / ch;

        placeholders.forEach(p => {
            const clone = document.createElement('div');
            clone.className = 'export-node';
            clone.innerText = p.innerText.replace('[NAME_PLACEHOLDER]', names[i]);

            // Map editor pixel coords → full-res output coords using the same scale ratio
            clone.style.position = 'absolute';
            const exportedFontSize = parseFloat(p.style.fontSize) * scaleY;
            clone.style.left = (parseFloat(p.style.left) * scaleX) + 'px';
            clone.style.top = (parseFloat(p.style.top) * scaleY - exportedFontSize * 0.5) + 'px';
            clone.style.width = (parseFloat(p.style.width) * scaleX) + 'px';
            clone.style.fontSize = exportedFontSize + 'px';
            clone.style.fontFamily = p.style.fontFamily;
            clone.style.textAlign = p.style.textAlign;
            clone.style.color = p.style.color;
            clone.style.fontWeight = p.style.fontWeight;
            clone.style.fontStyle = p.style.fontStyle;
            clone.style.lineHeight = '1';
            clone.style.whiteSpace = 'pre-wrap';
            clone.style.opacity = '1'; // Always full opacity in exports
            exportBox.appendChild(clone);
        });

        const canvas = await html2canvas(exportBox, { scale: 1, useCORS: true, width: originalImgWidth, height: originalImgHeight });
        generatedCanvases.push({ name: names[i], canvas });

        const previewImg = document.createElement('img');
        previewImg.src = canvas.toDataURL('image/png');
        previewImg.className = "result-preview";
        resultsContainer.appendChild(previewImg);
    }

    // Wait for the 3rd second to complete if generation was faster
    await timerPromise;

    zoomContainer.classList.add('hidden');
    resultsContainer.classList.remove('hidden');
    sidebarEditor.classList.add('hidden');
    sidebarExport.classList.remove('hidden');
    document.getElementById('exportOverlay').style.display = 'none';

    zoomLevel = 1.0;
    updateZoom();
};

async function exportBatch(format) {
    const orientation = originalImgWidth > originalImgHeight ? 'l' : 'p';
    if (format === 'pdf') {
        const pdf = new jsPDF({ orientation, unit: 'px', format: [originalImgWidth, originalImgHeight] });
        generatedCanvases.forEach((item, i) => {
            if (i > 0) pdf.addPage([originalImgWidth, originalImgHeight], orientation);
            pdf.addImage(item.canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, originalImgWidth, originalImgHeight);
        });
        pdf.save('batch.pdf');
    } else {
        generatedCanvases.forEach(item => {
            const link = document.createElement('a'); link.download = `${item.name}.png`;
            link.href = item.canvas.toDataURL('image/png'); link.click();
        });
    }
}

btnBackToEditor.onclick = () => {
    zoomContainer.classList.remove('hidden'); resultsContainer.classList.add('hidden');
    sidebarEditor.classList.remove('hidden'); sidebarExport.classList.add('hidden');
};
btnDropdownToggle.onclick = (e) => {
    e.stopPropagation();
    dropdownContent.classList.toggle('show');
};
nameListInput.oninput = () => {
    const count = nameListInput.value.split('\n').filter(n => n.trim() !== "").length;
    document.getElementById('nameCountDisplay').innerText = `${count} NAMES READY`;
};
window.onclick = () => dropdownContent.classList.remove('show');

// Theme Toggle Logic
const themeCheckbox = document.getElementById('themeCheckbox');
const savedTheme = localStorage.getItem('theme') || 'light';

// Initial Load
if (savedTheme === 'dark') {
    document.body.classList.add('dark');
    themeCheckbox.checked = false;
} else {
    document.body.classList.remove('dark');
    themeCheckbox.checked = true;
}

themeCheckbox.addEventListener('change', () => {
    if (themeCheckbox.checked) {
        document.body.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    } else {
        document.body.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }
});
