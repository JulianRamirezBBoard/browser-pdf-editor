import { useShallow } from 'zustand/react/shallow'
import { announce } from '../../state/announcer'
import { selectTextBoxesForPage } from '../../state/selectors'
import { useWorkingDocumentStore } from '../../state/workingDocumentStore'
import { TextBoxItem } from './TextBoxItem'

interface TextBoxLayerProps {
  pageId: string
  scale: number
  pageHeightPt: number
  pageWidthPt: number
  focusBoxId: string | null
}

export function TextBoxLayer({
  pageId,
  scale,
  pageHeightPt,
  pageWidthPt,
  focusBoxId,
}: TextBoxLayerProps) {
  const textBoxes = useWorkingDocumentStore(useShallow(selectTextBoxesForPage(pageId)))
  const updateTextBox = useWorkingDocumentStore((s) => s.updateTextBox)
  const deleteTextBox = useWorkingDocumentStore((s) => s.deleteTextBox)

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {textBoxes.map((box, index) => (
        <TextBoxItem
          key={box.id}
          index={index + 1}
          annotation={box}
          scale={scale}
          pageHeightPt={pageHeightPt}
          pageWidthPt={pageWidthPt}
          autoFocus={box.id === focusBoxId}
          onCommitRect={(id, xPt, yPt, widthPt, heightPt) =>
            updateTextBox(id, { xPt, yPt, widthPt, heightPt })
          }
          onChangeText={(id, text) => updateTextBox(id, { text })}
          onChangeFont={(id, fontFamily) => updateTextBox(id, { fontFamily })}
          onChangeFontSize={(id, fontSizePt) => updateTextBox(id, { fontSizePt })}
          onChangeColor={(id, colorRgb) => updateTextBox(id, { colorRgb })}
          onDelete={(id) => {
            deleteTextBox(id)
            announce(`Text box ${index + 1} deleted`)
          }}
        />
      ))}
    </div>
  )
}
