import { useMemo } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

export default function RichTextEditor({ label, value, onChange, placeholder }) {
  const modules = useMemo(
    () => ({
      toolbar: [
        ['bold', 'italic', 'underline'],
        [{ list: 'bullet' }, { list: 'ordered' }],
        ['clean'],
      ],
    }),
    [],
  )

  return (
    <label className="notes-field">
      <span>{label}</span>
      <div className="rte-quill">
        <ReactQuill
          theme="snow"
          value={value || ''}
          onChange={onChange}
          placeholder={placeholder}
          modules={modules}
        />
      </div>
    </label>
  )
}
