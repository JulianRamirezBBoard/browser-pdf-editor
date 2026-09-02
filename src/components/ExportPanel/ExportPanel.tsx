import { useState } from 'react'
import {
  buildExportFiles,
  buildZipFile,
  downloadFile,
  ExportValidationError,
  type ExportedFile,
} from '../../pdf/export'
import type { WorkingDocument } from '../../pdf/types'
import { ErrorBanner } from '../ErrorBanner/ErrorBanner'

interface ExportPanelProps {
  workingDocument: WorkingDocument
}

export function ExportPanel({ workingDocument }: ExportPanelProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [preparedFiles, setPreparedFiles] = useState<ExportedFile[] | null>(null)
  const [statusMessage, setStatusMessage] = useState('')

  const reportError = (err: unknown) => {
    if (err instanceof ExportValidationError) {
      setErrorMessage(err.message)
    } else {
      console.error('Export failed', err)
      setErrorMessage('This document could not be exported.')
    }
    setStatusMessage('Export failed.')
  }

  const handlePrepareExport = async () => {
    setIsExporting(true)
    setErrorMessage(null)
    setPreparedFiles(null)
    setStatusMessage('Preparing export…')
    try {
      const files = await buildExportFiles(workingDocument)
      if (files.length === 1) {
        downloadFile(files[0])
        setStatusMessage('Export ready. The download has started.')
      } else {
        setPreparedFiles(files)
        setStatusMessage(`Export ready. Split into ${files.length} files to download.`)
      }
    } catch (err) {
      reportError(err)
    } finally {
      setIsExporting(false)
    }
  }

  const handleDownloadZip = async () => {
    if (!preparedFiles) {
      return
    }
    setIsExporting(true)
    setErrorMessage(null)
    setStatusMessage('Building the ZIP file…')
    try {
      const baseName = workingDocument.sourceFileName.replace(/\.pdf$/i, '')
      const zipFile = await buildZipFile(preparedFiles, `${baseName}.zip`)
      downloadFile(zipFile)
      setStatusMessage('ZIP ready. The download has started.')
    } catch (err) {
      console.error('ZIP failed', err)
      setErrorMessage('This document could not be zipped.')
      setStatusMessage('ZIP failed.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <section
      aria-labelledby="export-heading"
      className="mt-[22px] block border-t border-rule pt-[22px] max-[1080px]:mt-0 max-[1080px]:border-t-0 max-[1080px]:pt-0"
    >
      <h2 id="export-heading" className="panel-label mb-3">
        Export
      </h2>
      <button
        type="button"
        className="btn btn-primary w-full"
        onClick={() => void handlePrepareExport()}
        disabled={isExporting}
      >
        {isExporting ? 'Exporting…' : 'Export PDF'}
      </button>
      <div className="status" role="status" aria-live="polite" aria-busy={isExporting}>
        {statusMessage}
      </div>
      {errorMessage && <ErrorBanner message={errorMessage} />}
      {preparedFiles && (
        <div>
          <p className="mt-3 font-mono text-xs leading-normal text-chrome-muted">
            Split into {preparedFiles.length} files:
          </p>
          <ul className="m-0 mt-3 flex list-none flex-col gap-1.5 p-0">
            {preparedFiles.map((file) => (
              <li key={file.name}>
                <button
                  type="button"
                  className="btn w-full justify-start text-left font-mono text-[11px] leading-snug"
                  onClick={() => downloadFile(file)}
                >
                  Download {file.name}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn mt-1.5 w-full"
            onClick={() => void handleDownloadZip()}
            disabled={isExporting}
          >
            Download all as ZIP
          </button>
        </div>
      )}
    </section>
  )
}
