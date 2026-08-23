import React from "react";
import { X, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACADEMIC_TRACKS, getTrack } from "@/data/academic";

interface FileItem {
  id: number;
  courseId?: number | null;
  title: string;
  category: string;
  stage?: string | null;
  stages?: string[];
  targetType?: "stages" | "videos";
  videoIds?: number[];
  subject?: string | null;
  tags?: string[];
  order?: number;
  originalName: string;
  description?: string | null;
  mimeType?: string;
  sizeBytes: number;
  isPublished: boolean;
  createdAt?: string;
}

interface VideoOption {
  id: number;
  courseId?: number | null;
  title: string;
  category: string;
  stage?: string | null;
  stages?: string[];
}

export interface FileModalProps {
  editingFile: FileItem | null;
  setEditingFile: (file: FileItem | null) => void;
  saveEditedFile: () => Promise<void>;
  previewFile: FileItem | null;
  setPreviewFile: (file: FileItem | null) => void;
  videoOptions: VideoOption[];
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block space-y-1.5 text-right">
    <span className="text-xs font-black text-slate-700">{label}</span>
    {children}
  </label>
);

export const FileModal: React.FC<FileModalProps> = ({
  editingFile,
  setEditingFile,
  saveEditedFile,
  previewFile,
  setPreviewFile,
  videoOptions,
}) => {
  return (
    <>
      {editingFile && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setEditingFile(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black">تعديل الملف</h3>
                <p className="text-xs text-slate-500">
                  غيّر مكان ظهوره بدون إعادة رفعه.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingFile(null)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <Field label="اسم الملف">
              <input
                className="input-admin"
                value={editingFile.title}
                onChange={(event) =>
                  setEditingFile({ ...editingFile, title: event.target.value })
                }
              />
            </Field>
            <div className="my-4 grid grid-cols-2 gap-2">
              {(
                [
                  ["stages", "مراحل محددة"],
                  ["videos", "فيديو أو درس"],
                ] as const
              ).map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  onClick={() =>
                    setEditingFile({
                      ...editingFile,
                      targetType: value,
                      stages: [],
                      videoIds: [],
                    })
                  }
                  className={`rounded-xl border p-3 font-bold ${
                    editingFile.targetType === value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {editingFile.targetType === "videos" ? (
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border p-3">
                {videoOptions.map((video) => {
                  const checked =
                    editingFile.videoIds?.includes(video.id) || false;
                  return (
                    <label
                      key={video.id}
                      className="flex gap-3 rounded-lg p-2 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setEditingFile({
                            ...editingFile,
                            videoIds: checked
                              ? editingFile.videoIds?.filter(
                                  (id) => id !== video.id,
                                )
                              : [...(editingFile.videoIds || []), video.id],
                          })
                        }
                      />
                      <span>
                        <strong className="block text-sm">{video.title}</strong>
                        <small>{video.category}</small>
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  {ACADEMIC_TRACKS.map((track) => (
                    <button
                      type="button"
                      key={track.id}
                      onClick={() =>
                        setEditingFile({
                          ...editingFile,
                          courseId: null,
                          category: track.id,
                          stages: [],
                        })
                      }
                      className={`rounded-xl border p-3 text-sm font-bold ${
                        getTrack(editingFile.category)?.id === track.id
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-slate-200"
                      }`}
                    >
                      {track.shortTitle}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 rounded-xl border p-3">
                  {(getTrack(editingFile.category)?.stages || []).map((stage) => {
                    const checked =
                      editingFile.stages?.includes(stage) || false;
                    return (
                      <button
                        type="button"
                        key={stage}
                        onClick={() =>
                          setEditingFile({
                            ...editingFile,
                            stages: checked
                              ? editingFile.stages?.filter(
                                  (item) => item !== stage,
                                )
                              : [...(editingFile.stages || []), stage],
                          })
                        }
                        className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                          checked ? "bg-primary text-white" : "bg-slate-50"
                        }`}
                      >
                        {stage}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingFile(null)}>
                إلغاء
              </Button>
              <Button onClick={() => void saveEditedFile()}>
                حفظ التعديلات
              </Button>
            </div>
          </div>
        </div>
      )}

      {previewFile && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="w-full max-w-4xl rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-black">{previewFile.title}</h3>
                <p className="text-xs text-slate-500">
                  {previewFile.originalName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <iframe
              src={`/api/learning/files/${previewFile.id}/preview`}
              title={`معاينة ${previewFile.title}`}
              className="h-[70vh] w-full rounded-xl border bg-slate-50"
            />
            <a
              href={`/api/learning/files/${previewFile.id}/preview`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
            >
              <Eye className="h-4 w-4" />
              معاينة الملف (للعرض فقط)
            </a>
          </div>
        </div>
      )}
    </>
  );
};
