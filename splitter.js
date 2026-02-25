let splitMasterZip = null;
let splitOpfPath = "";
let splitOpfDir = "";
let splitOpfDoc = null;
let allItems = [];
let spineItems = [];
let storyChapters = [];
let frontMatter = [];
let baseBookTitle = "Unknown Title";

let splitCustomCoverFile = null;
const splitCoverInput = document.getElementById('split-cover-input');
const btnSplitCover = document.getElementById('btn-split-cover');
const btnRemoveSplitCover = document.getElementById('btn-remove-split-cover');
const splitCoverPreview = document.getElementById('split-cover-preview');
const splitTitleInput = document.getElementById('split-title-input');

btnSplitCover.addEventListener('click', () => splitCoverInput.click());
splitCoverPreview.addEventListener('click', () => splitCoverInput.click());

splitCoverInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        splitCustomCoverFile = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            splitCoverPreview.innerHTML = `<img src="${event.target.result}" class="w-full h-full object-cover">`;
            btnRemoveSplitCover.classList.remove('hidden');
        };
        reader.readAsDataURL(splitCustomCoverFile);
    }
});

btnRemoveSplitCover.addEventListener('click', () => {
    splitCustomCoverFile = null;
    splitCoverInput.value = '';
    splitCoverPreview.innerHTML = `<span class="text-xs text-slate-400 text-center px-2">Current<br>Cover</span>`;
    btnRemoveSplitCover.classList.add('hidden');
});

// Added target checks to prevent click bubbling
document.getElementById('upload-section').addEventListener('click', (e) => {
    if (e.target !== document.getElementById('epub-input')) {
        document.getElementById('epub-input').click();
    }
});

document.getElementById('epub-input').addEventListener('change', (e) => {
    if (e.target.files.length > 0) processSplitFile(e.target.files[0]);
});

async function processSplitFile(file) {
    // Show loading progress for large files
    const loadingWrapper = document.getElementById('loading-progress-wrapper');
    const loadingBar = document.getElementById('loading-progress-bar');
    const loadingPercent = document.getElementById('loading-progress-percent');
    const loadingStatus = document.getElementById('loading-progress-status');

    // Memory pressure warning for very large files
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
    if (file.size > 500 * 1024 * 1024) {
        showToast(`⚠️ Large file detected (${fileSizeMB}MB). Processing may use significant RAM.`, 'warn');
    }

    if (loadingWrapper) {
        loadingWrapper.classList.remove('hidden');
        loadingStatus.textContent = `Loading ${fileSizeMB}MB EPUB...`;
    }

    document.getElementById('editor-section').classList.add('hidden');

    const logEl = document.getElementById('status-log');
    logEl.innerHTML = '<div class="text-indigo-400">> System ready. Unpacking EPUB...</div>';

    try {
        splitMasterZip = await new JSZip().loadAsync(file, {
            // JSZip doesn't natively support loadAsync progress, so we use a wrapper
        });

        const containerXml = await splitMasterZip.file("META-INF/container.xml").async("text");
        const parser = new DOMParser();
        splitOpfPath = parser.parseFromString(containerXml, "text/xml").querySelector("rootfile").getAttribute("full-path");
        splitOpfDir = splitOpfPath.includes("/") ? splitOpfPath.substring(0, splitOpfPath.lastIndexOf('/') + 1) : "";

        const opfText = await splitMasterZip.file(splitOpfPath).async("text");
        splitOpfDoc = parser.parseFromString(opfText, "text/xml");

        // Set dynamic title input
        const titleNode = splitOpfDoc.getElementsByTagName("dc:title")[0];
        if (titleNode) baseBookTitle = titleNode.textContent;
        splitTitleInput.value = baseBookTitle;

        try {
            let coverItem = splitOpfDoc.querySelector('item[properties~="cover-image"]');
            if (!coverItem) {
                const metaCover = splitOpfDoc.querySelector('meta[name="cover"]');
                if (metaCover) {
                    const coverId = metaCover.getAttribute("content");
                    coverItem = splitOpfDoc.querySelector(`item[id="${coverId}"]`);
                }
            }
            if (!coverItem) {
                coverItem = Array.from(splitOpfDoc.querySelectorAll('item[media-type^="image"]')).find(item => {
                    const h = (item.getAttribute('href') || '').toLowerCase();
                    const id = (item.getAttribute('id') || '').toLowerCase();
                    return h.includes('cover') || id.includes('cover');
                });
            }

            if (coverItem) {
                let coverHref = coverItem.getAttribute("href");
                if (coverHref.startsWith('../')) coverHref = coverHref.replace('../', '');
                const fullCoverPath = splitOpfDir + coverHref;
                const coverFile = splitMasterZip.file(fullCoverPath);
                if (coverFile) {
                    const coverBlob = await coverFile.async("blob"); // Use blob instead of base64
                    const blobUrl = URL.createObjectURL(coverBlob);
                    splitCoverPreview.innerHTML = `<img src="${blobUrl}" class="w-full h-full object-cover">`;

                }
            }
        } catch (e) {
            console.log("Cover preview fallback used or no cover found.");
        }

        allItems = Array.from(splitOpfDoc.querySelectorAll("manifest > item")).map(el => ({
            id: el.getAttribute("id"),
            href: el.getAttribute("href"),
            mediaType: el.getAttribute("media-type")
        }));

        const spineNodes = Array.from(splitOpfDoc.querySelectorAll("spine > itemref"));
        spineItems = spineNodes.map(el => el.getAttribute("idref"));

        storyChapters = [];
        frontMatter = [];

        spineItems.forEach((idref, index) => {
            const item = allItems.find(i => i.id === idref);
            if (!item) return;

            const textCheck = (item.href + idref).toLowerCase();
            const isFrontMatter = /cover|title|copyright|dedication|acknowledgment|toc|nav|preface|foreword|introduction|prologue|epigraph/.test(textCheck);

            if (isFrontMatter) {
                frontMatter.push({ idref, item, index, originalName: item.href });
            } else {
                storyChapters.push({ idref, item, index, originalName: item.href, displayIndex: storyChapters.length + 1 });
            }
        });

        document.getElementById('chapter-count').textContent = `${storyChapters.length} story chapters detected`;

        const listEl = document.getElementById('chapter-list');
        listEl.innerHTML = '';
        storyChapters.forEach(chap => {
            const div = document.createElement('div');
            div.className = "flex items-start gap-3 py-2";
            div.innerHTML = `
                <input type="checkbox" id="chk-${chap.idref}" value="${chap.idref}" class="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer chap-checkbox" checked>
                <label for="chk-${chap.idref}" class="flex-1 cursor-pointer">
                    <span class="font-bold text-slate-700 dark:text-slate-300">#${chap.displayIndex}</span>
                    <span class="chap-name text-slate-500 dark:text-slate-400 ml-1 break-all whitespace-normal" data-idref="${chap.idref}" title="Double-click to rename">${chap.customName || chap.originalName}</span>
                </label>
            `;
            // Double-click to rename chapter
            const nameSpan = div.querySelector('.chap-name');
            nameSpan.addEventListener('dblclick', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const input = document.createElement('input');
                input.type = 'text';
                input.value = chap.customName || chap.originalName;
                input.className = 'w-full bg-white dark:bg-slate-800 border border-indigo-400 rounded px-2 py-0.5 text-sm font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500';
                nameSpan.replaceWith(input);
                input.focus();
                input.select();
                const finishRename = () => {
                    const newName = input.value.trim();
                    if (newName) chap.customName = newName;
                    const newSpan = document.createElement('span');
                    newSpan.className = 'chap-name text-slate-500 dark:text-slate-400 ml-1 break-all whitespace-normal';
                    newSpan.setAttribute('data-idref', chap.idref);
                    newSpan.setAttribute('title', 'Double-click to rename');
                    newSpan.textContent = chap.customName || chap.originalName;
                    input.replaceWith(newSpan);
                    // Re-attach dblclick
                    newSpan.addEventListener('dblclick', nameSpan._dblclickHandler);
                };
                nameSpan._dblclickHandler = (e2) => {
                    e2.preventDefault();
                    e2.stopPropagation();
                    const inp2 = document.createElement('input');
                    inp2.type = 'text';
                    inp2.value = chap.customName || chap.originalName;
                    inp2.className = input.className;
                    e2.target.replaceWith(inp2);
                    inp2.focus(); inp2.select();
                    inp2.addEventListener('blur', finishRename);
                    inp2.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') inp2.blur(); if (ev.key === 'Escape') { inp2.value = chap.customName || chap.originalName; inp2.blur(); } });
                };
                input.addEventListener('blur', finishRename);
                input.addEventListener('keydown', (ev) => {
                    if (ev.key === 'Enter') input.blur();
                    if (ev.key === 'Escape') { input.value = chap.customName || chap.originalName; input.blur(); }
                });
            });
            listEl.appendChild(div);
        });

        const updateCount = () => {
            document.getElementById('preview-count').textContent = `${document.querySelectorAll('.chap-checkbox:checked').length} selected`;
        };
        document.querySelectorAll('.chap-checkbox').forEach(cb => cb.addEventListener('change', updateCount));
        updateCount();

        logMsg("EPUB Loaded and parsed successfully.");
        logMsg(`File size: ${fileSizeMB}MB | ${storyChapters.length} chapters`);

        // Hide loading, show editor
        if (loadingWrapper) loadingWrapper.classList.add('hidden');
        document.getElementById('upload-section').classList.add('hidden');
        document.getElementById('editor-section').classList.remove('hidden');

        // Calculate and display estimated output size
        updateEstimatedSize();

    } catch (err) {
        console.error(err);
        if (loadingWrapper) loadingWrapper.classList.add('hidden');
        showToast("Failed to parse EPUB.", "error");
    }
}

async function executeSplit(selectedIdrefs, rangeSuffix) {
    logMsg(`Starting export...`);
    const btnCustom = document.getElementById('btn-export-custom');
    btnCustom.disabled = true;

    try {
        const newZip = new JSZip();
        newZip.file("mimetype", "application/epub+zip", { compression: "STORE" });

        const allowedIdrefs = new Set([...frontMatter.map(f => f.idref), ...selectedIdrefs]);
        const allowedHrefs = new Set();

        allItems.forEach(item => {
            if (allowedIdrefs.has(item.id)) allowedHrefs.add(item.href);
            else if (!item.mediaType.includes('html')) allowedHrefs.add(item.href);
        });

        // If "Keep Only Text" is checked, strip non-HTML assets
        const keepOnlyText = document.getElementById('keep-only-text')?.checked;

        for (let path in splitMasterZip.files) {
            if (path === "mimetype" || splitMasterZip.files[path].dir) continue;
            let shouldInclude = true;
            if (path.endsWith('.html') || path.endsWith('.xhtml')) {
                shouldInclude = false;
                for (let href of allowedHrefs) {
                    if (path.endsWith(href)) { shouldInclude = true; break; }
                }
            }
            // Strip images, fonts, CSS if keepOnlyText
            if (keepOnlyText && shouldInclude) {
                const lp = path.toLowerCase();
                if (lp.endsWith('.jpg') || lp.endsWith('.jpeg') || lp.endsWith('.png') || lp.endsWith('.gif') || lp.endsWith('.webp') || lp.endsWith('.svg')) shouldInclude = false;
                if (lp.endsWith('.ttf') || lp.endsWith('.otf') || lp.endsWith('.woff') || lp.endsWith('.woff2')) shouldInclude = false;
                if (lp.endsWith('.css')) shouldInclude = false;
            }
            if (shouldInclude || path.includes("META-INF") || path.endsWith(".opf") || path.endsWith(".ncx")) {
                newZip.file(path, await splitMasterZip.files[path].async("arraybuffer"));
            }
        }

        const newOpfDoc = splitOpfDoc.cloneNode(true);
        const spine = newOpfDoc.querySelector("spine");
        const manifest = newOpfDoc.querySelector("manifest");

        Array.from(spine.querySelectorAll("itemref")).forEach(ref => {
            if (!allowedIdrefs.has(ref.getAttribute("idref"))) spine.removeChild(ref);
        });

        Array.from(manifest.querySelectorAll("item")).forEach(item => {
            if (item.getAttribute("media-type").includes("html") && !allowedIdrefs.has(item.getAttribute("id"))) {
                manifest.removeChild(item);
            }
        });

        let currentTitle = splitTitleInput.value.trim() || baseBookTitle;
        let finalTitle, finalDisplayName;

        if (rangeSuffix === "Custom Extract") {
            finalTitle = currentTitle;
            finalDisplayName = finalTitle;
        } else {
            finalTitle = `${currentTitle} (${rangeSuffix})`;
            finalDisplayName = finalTitle;
        }

        setSmartTitle(newOpfDoc, finalTitle);
        forceNewIdentifier(newOpfDoc);

        if (splitCustomCoverFile) {
            try {
                logMsg("Applying custom cover...");
                const coverExt = splitCustomCoverFile.name.split('.').pop().toLowerCase();
                const coverMime = coverExt === 'png' ? 'image/png' : 'image/jpeg';
                const coverData = await splitCustomCoverFile.arrayBuffer();

                let coverItem = newOpfDoc.querySelector('item[properties~="cover-image"]');
                if (!coverItem) {
                    const metaCover = newOpfDoc.querySelector('meta[name="cover"]');
                    if (metaCover) {
                        const coverId = metaCover.getAttribute("content");
                        coverItem = newOpfDoc.querySelector(`item[id="${coverId}"]`);
                    }
                }
                if (coverItem) {
                    const existingHref = coverItem.getAttribute("href");
                    newZip.file(splitOpfDir + existingHref, coverData);
                    coverItem.setAttribute("media-type", coverMime);
                } else {
                    const newCoverHref = `custom_cover_${Date.now()}.${coverExt}`;
                    const newCoverId = `custom_cover_id`;
                    newZip.file(splitOpfDir + newCoverHref, coverData);
                    const newItem = newOpfDoc.createElement("item");
                    newItem.setAttribute("id", newCoverId);
                    newItem.setAttribute("href", newCoverHref);
                    newItem.setAttribute("media-type", coverMime);
                    newItem.setAttribute("properties", "cover-image");
                    manifest.appendChild(newItem);
                    let metadata = newOpfDoc.querySelector("metadata");
                    if (metadata) {
                        const meta = newOpfDoc.createElement("meta");
                        meta.setAttribute("name", "cover");
                        meta.setAttribute("content", newCoverId);
                        metadata.appendChild(meta);
                    }
                }
            } catch (e) { console.error("Failed to apply cover:", e); }
        }

        newZip.file(splitOpfPath, new XMLSerializer().serializeToString(newOpfDoc));

        logMsg(`Compressing & Zipping...`);

        let blob;
        if (window.location.protocol === 'file:') {
            console.log("Local file execution detected. Falling back to main-thread zip generation.");
            blob = await newZip.generateAsync(
                { type: "blob", compression: "DEFLATE", mimeType: "application/epub+zip" },
                function updateCallback(metadata) {
                    const pWrapper = document.getElementById('split-progress-wrapper');
                    const pBar = document.getElementById('split-progress-bar');
                    const pPercent = document.getElementById('split-progress-percent');
                    if (pWrapper) pWrapper.classList.remove('hidden');
                    if (pBar) pBar.style.width = metadata.percent.toFixed(0) + '%';
                    if (pPercent) pPercent.textContent = metadata.percent.toFixed(0) + '%';
                }
            );
        } else {
            // Pass to Web Worker
            const serializedFiles = {};
            for (let path in newZip.files) {
                if (path === "mimetype" || newZip.files[path].dir) continue;
                serializedFiles[path] = await newZip.files[path].async("arraybuffer");
            }

            const worker = new Worker('zip-worker.js');
            worker.postMessage({ id: 'split', filesConfig: serializedFiles });

            blob = await new Promise((resolve, reject) => {
                worker.onmessage = (e) => {
                    const data = e.data;
                    if (data.type === 'progress') {
                        const pWrapper = document.getElementById('split-progress-wrapper');
                        const pBar = document.getElementById('split-progress-bar');
                        const pPercent = document.getElementById('split-progress-percent');

                        if (pWrapper) pWrapper.classList.remove('hidden');
                        if (pBar) pBar.style.width = data.percent.toFixed(0) + '%';
                        if (pPercent) pPercent.textContent = data.percent.toFixed(0) + '%';
                    } else if (data.type === 'success') {
                        resolve(data.blob);
                        worker.terminate();
                    } else if (data.type === 'error') {
                        reject(new Error(data.error));
                        worker.terminate();
                    }
                };
            });
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${sanitizeFilename(finalDisplayName)}.epub`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        logMsg(`Success.`);
        showToast(`Exported`, "success");
        addExportEntry(finalDisplayName, 'split', rangeSuffix);

        // Quick EPUB Validation
        try {
            logMsg('Running validation...');
            const valZip = await new JSZip().loadAsync(blob);
            const valIssues = [];
            if (!valZip.file('mimetype')) valIssues.push('Missing mimetype file');
            if (!valZip.file('META-INF/container.xml')) valIssues.push('Missing container.xml');
            const valContainer = valZip.file('META-INF/container.xml');
            if (valContainer) {
                const vcXml = await valContainer.async('text');
                const vcDoc = new DOMParser().parseFromString(vcXml, 'text/xml');
                const opfRef = vcDoc.querySelector('rootfile');
                if (opfRef) {
                    const opfP = opfRef.getAttribute('full-path');
                    if (!valZip.file(opfP)) valIssues.push(`Missing OPF: ${opfP}`);
                    else {
                        const opfXml = await valZip.file(opfP).async('text');
                        const opfD = new DOMParser().parseFromString(opfXml, 'text/xml');
                        const spineRefs = Array.from(opfD.querySelectorAll('spine > itemref')).map(r => r.getAttribute('idref'));
                        const manifestIds = new Set(Array.from(opfD.querySelectorAll('manifest > item')).map(i => i.getAttribute('id')));
                        spineRefs.forEach(id => { if (!manifestIds.has(id)) valIssues.push(`Spine ref '${id}' missing from manifest`); });
                    }
                }
            }
            if (valIssues.length === 0) {
                logMsg('\u2705 Validation passed. EPUB looks healthy!');
            } else {
                valIssues.forEach(issue => logMsg(`\u26a0\ufe0f ${issue}`));
                showToast(`${valIssues.length} validation warning(s)`, 'warn');
            }
        } catch (valErr) {
            logMsg('Validation skipped: ' + valErr.message);
        }
    } catch (err) {
        console.error(err);
        showToast("Export failed!", "error");
    } finally {
        btnCustom.disabled = false;
        const pWrapper = document.getElementById('split-progress-wrapper');
        const pBar = document.getElementById('split-progress-bar');
        if (pWrapper) pWrapper.classList.add('hidden');
        if (pBar) pBar.style.width = '0%';
    }
}

document.getElementById('btn-select-all').addEventListener('click', () => {
    document.querySelectorAll('.chap-checkbox').forEach(cb => cb.checked = true);
    document.getElementById('preview-count').textContent = `${storyChapters.length} selected`;
});

document.getElementById('btn-deselect-all').addEventListener('click', () => {
    document.querySelectorAll('.chap-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('preview-count').textContent = `0 selected`;
});

document.getElementById('btn-export-custom').addEventListener('click', () => {
    const selected = Array.from(document.querySelectorAll('.chap-checkbox:checked')).map(cb => cb.value);
    if (selected.length === 0) return showToast("No chapters selected!", "warn");
    executeSplit(selected, "Custom Extract");
});

document.getElementById('btn-export-range').addEventListener('click', () => {
    const start = parseInt(document.getElementById('range-start').value);
    const end = parseInt(document.getElementById('range-end').value);
    if (!start || !end || start > end || start < 1 || end > storyChapters.length) return showToast("Invalid range.", "warn");
    const selected = storyChapters.slice(start - 1, end).map(c => c.idref);
    executeSplit(selected, `${start}-${end}`);
});

document.getElementById('btn-export-chunks').addEventListener('click', async () => {
    const mode = document.querySelector('input[name="split-mode"]:checked').value;

    if (mode === 'chapters') {
        const size = parseInt(document.getElementById('chunk-size').value);
        if (!size || size < 1) return showToast("Invalid chunk size.", "warn");

        for (let i = 0; i < storyChapters.length; i += size) {
            const chunk = storyChapters.slice(i, i + size);
            const start = chunk[0].displayIndex;
            const end = chunk[chunk.length - 1].displayIndex;
            const selected = chunk.map(c => c.idref);
            await executeSplit(selected, `${start}-${end}`);
        }
    } else {
        const targetMb = parseFloat(document.getElementById('chunk-size-mb').value);
        if (!targetMb || targetMb <= 0) return showToast("Invalid target size.", "warn");
        const targetBytes = targetMb * 1024 * 1024;

        showToast("Estimating split sizes...", "info");

        let baselineSize = 0;
        // Estimate baseline size (frontmatter + assets)
        for (let path in splitMasterZip.files) {
            if (path === "mimetype" || splitMasterZip.files[path].dir) continue;
            if (!path.endsWith('.html') && !path.endsWith('.xhtml')) {
                const rawStats = splitMasterZip.files[path]._data; // uncompressed stats
                if (rawStats && rawStats.uncompressedSize) baselineSize += rawStats.uncompressedSize;
            }
        }

        let chunks = [];
        let currentChunk = [];
        let currentSize = baselineSize;

        for (let i = 0; i < storyChapters.length; i++) {
            const chap = storyChapters[i];
            let chapSize = 0;
            const fullPath = splitOpfDir + chap.originalName;
            const fileObj = splitMasterZip.files[fullPath];
            if (fileObj && fileObj._data && fileObj._data.uncompressedSize) {
                chapSize = fileObj._data.uncompressedSize;
            } else {
                chapSize = 50 * 1024; // fallback 50kb
            }

            if (currentChunk.length > 0 && (currentSize + chapSize) > targetBytes) {
                chunks.push(currentChunk);
                currentChunk = [chap];
                currentSize = baselineSize + chapSize;
            } else {
                currentChunk.push(chap);
                currentSize += chapSize;
            }
        }
        if (currentChunk.length > 0) chunks.push(currentChunk);

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const start = chunk[0].displayIndex;
            const end = chunk[chunk.length - 1].displayIndex;
            const selected = chunk.map(c => c.idref);
            await executeSplit(selected, `Part ${i + 1}`);
        }
    }
});

document.querySelectorAll('input[name="split-mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.value === 'chapters') {
            document.getElementById('split-mode-chapters-wrapper').classList.remove('hidden');
            document.getElementById('split-mode-size-wrapper').classList.add('hidden');
        } else {
            document.getElementById('split-mode-chapters-wrapper').classList.add('hidden');
            document.getElementById('split-mode-size-wrapper').classList.remove('hidden');
        }
    });
});

document.getElementById('btn-reset').addEventListener('click', () => location.reload());

// --- Chapter Search / Filter ---
document.getElementById('chapter-search')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const items = document.querySelectorAll('#chapter-list > div');
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query) ? '' : 'none';
    });
});

// --- Batch Rename ---
document.getElementById('btn-batch-rename')?.addEventListener('click', () => {
    const pattern = prompt(
        'Enter rename pattern.\n\nUse {n} for chapter number and {original} for original filename.\n\nExamples:\n  Chapter {n}\n  Ch. {n} - {original}',
        'Chapter {n}'
    );
    if (!pattern) return;

    storyChapters.forEach(chap => {
        chap.customName = pattern
            .replace('{n}', chap.displayIndex)
            .replace('{original}', chap.originalName);
    });

    // Update visible chapter names
    document.querySelectorAll('#chapter-list .chap-name').forEach(span => {
        const idref = span.getAttribute('data-idref');
        const chap = storyChapters.find(c => c.idref === idref);
        if (chap) span.textContent = chap.customName || chap.originalName;
    });

    showToast(`Renamed ${storyChapters.length} chapters`, 'success');
});

// --- Estimated Output Size ---
function updateEstimatedSize() {
    const sizeEl = document.getElementById('estimated-size');
    const sizeValEl = document.getElementById('estimated-size-value');
    if (!sizeEl || !sizeValEl || !splitMasterZip) return;

    const checked = Array.from(document.querySelectorAll('.chap-checkbox:checked')).map(cb => cb.value);
    if (checked.length === 0) {
        sizeEl.classList.add('hidden');
        return;
    }

    let totalBytes = 0;

    // Add baseline (non-HTML assets)
    for (let path in splitMasterZip.files) {
        if (path === "mimetype" || splitMasterZip.files[path].dir) continue;
        if (!path.endsWith('.html') && !path.endsWith('.xhtml')) {
            const f = splitMasterZip.files[path];
            if (f._data && f._data.uncompressedSize) totalBytes += f._data.uncompressedSize;
            else if (f._data && f._data.compressedSize) totalBytes += f._data.compressedSize;
        }
    }

    // Add selected chapters
    checked.forEach(idref => {
        const chap = storyChapters.find(c => c.idref === idref);
        if (!chap) return;
        const fullPath = splitOpfDir + chap.originalName;
        const f = splitMasterZip.files[fullPath];
        if (f && f._data && f._data.uncompressedSize) totalBytes += f._data.uncompressedSize;
        else totalBytes += 50 * 1024; // fallback
    });

    const mb = (totalBytes / (1024 * 1024)).toFixed(1);
    sizeValEl.textContent = mb;
    sizeEl.classList.remove('hidden');
}

// Recalculate size on checkbox change
document.addEventListener('change', (e) => {
    if (e.target.classList.contains('chap-checkbox')) {
        updateEstimatedSize();
    }
});
