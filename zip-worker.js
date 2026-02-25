// Web Worker for handling heavy JSZip generation off the main thread
importScripts("vendor/jszip.min.js");

self.onmessage = async function (e) {
    const { id, filesConfig } = e.data;

    try {
        const zip = new JSZip();

        // Setup initial mimetype with STORE compression
        if (filesConfig.mimetype) {
            zip.file("mimetype", filesConfig.mimetype, { compression: "STORE" });
            delete filesConfig.mimetype;
        }

        // Reconstruct JSZip state from the configuration object passed from main thread
        for (const [path, data] of Object.entries(filesConfig)) {
            zip.file(path, data);
        }

        const compressType = e.data.compression || "DEFLATE";

        const blob = await zip.generateAsync(
            { type: "blob", compression: compressType, mimeType: "application/epub+zip" },
            function updateCallback(metadata) {
                self.postMessage({ id, type: 'progress', percent: metadata.percent });
            }
        );

        self.postMessage({ id, type: 'success', blob });
    } catch (err) {
        self.postMessage({ id, type: 'error', error: err.toString() });
    }
};
