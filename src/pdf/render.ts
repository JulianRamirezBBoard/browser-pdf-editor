import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export interface OpenedPdf {
  doc: PDFDocumentProxy
  /** Tears down this document's worker transport. Call when the preview closes. */
  destroy: () => Promise<void>
}

export const openPdfDocument = async (bytes: Uint8Array): Promise<OpenedPdf> => {
  // pdf.js moves the buffer into its worker and empties it here. Pass a copy
  // so the caller can reopen the same bytes later.
  const task = getDocument({ data: bytes.slice() })
  const doc = await task.promise
  return { doc, destroy: () => task.destroy() }
}

const activeRenderTasks = new WeakMap<HTMLCanvasElement, RenderTask>()

export interface CancellableRender {
  promise: Promise<void>
  cancel: () => void
}

export const renderPageToCanvas = (
  pdf: PDFDocumentProxy,
  pageIndex: number,
  canvas: HTMLCanvasElement,
  scale: number,
): CancellableRender => {
  let isCancelled = false
  let renderTask: RenderTask | null = null

  const promise = (async () => {
    // A canvas cannot start a new render while its last one still runs.
    // React StrictMode mounts, cleans up, then remounts in one pass. Cleanup
    // sets isCancelled before any await resumes, so check it after each await
    // and stop early.
    const previousTask = activeRenderTasks.get(canvas)
    if (previousTask) {
      previousTask.cancel()
      try {
        await previousTask.promise
      } catch {
        // The previous render was cancelled on purpose. Nothing to clean up.
      }
    }
    if (isCancelled) {
      return
    }

    const page = await pdf.getPage(pageIndex + 1)
    if (isCancelled) {
      return
    }

    const viewport = page.getViewport({ scale })
    const outputScale = window.devicePixelRatio || 1

    canvas.width = Math.floor(viewport.width * outputScale)
    canvas.height = Math.floor(viewport.height * outputScale)
    canvas.style.width = `${Math.floor(viewport.width)}px`
    canvas.style.height = `${Math.floor(viewport.height)}px`

    const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined

    if (isCancelled) {
      return
    }
    renderTask = page.render({ canvas, transform, viewport })
    activeRenderTasks.set(canvas, renderTask)
    try {
      await renderTask.promise
    } catch (err) {
      if (!(err instanceof Error && err.name === 'RenderingCancelledException')) {
        throw err
      }
    } finally {
      if (activeRenderTasks.get(canvas) === renderTask) {
        activeRenderTasks.delete(canvas)
      }
    }
  })()

  return {
    promise,
    cancel: () => {
      isCancelled = true
      renderTask?.cancel()
    },
  }
}
