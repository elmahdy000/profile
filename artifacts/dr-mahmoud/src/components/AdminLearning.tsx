import { useEffect, useState } from "react";
import { Check, ClipboardCheck, Copy, FileText, GraduationCap, Loader2, Plus, RefreshCw, Trash2, Upload, UserCheck, UserX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Student = { id:number; name:string; phone:string; email?:string|null; status:string; accessCode?:string|null; governorate?:string|null; city?:string|null; grade?:string|null; otherGradeDetail?:string|null; enrolledCategories?:string[]; createdAt:string };
type FileItem = { id:number; title:string; category:string; originalName:string; sizeBytes:number; isPublished:boolean };
type Question = { prompt:string; options:string[]; correctIndex:number };
type Quiz = { id:number; title:string; category:string; passingScore:number; questions:Question[]; isPublished:boolean };
type Attempt = { id:number; studentName:string; quizTitle:string; score:number; passed:boolean; createdAt:string };

function authHeaders(json = true): HeadersInit {
  return json ? { "Content-Type": "application/json" } : {};
}

async function adminApi<T>(url:string, options:RequestInit={}):Promise<T>{
  const response=await fetch(url,{...options,credentials:"include",headers:{...authHeaders(!(options.body instanceof FormData)),...(options.headers||{})}});
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data.error||"تعذر تنفيذ الطلب");
  return data;
}

export function AdminLearning(){
  const {toast}=useToast();
  const [tab,setTab]=useState<"students"|"files"|"quizzes"|"results">("students");
  const [students,setStudents]=useState<Student[]>([]),[files,setFiles]=useState<FileItem[]>([]),[quizzes,setQuizzes]=useState<Quiz[]>([]),[attempts,setAttempts]=useState<Attempt[]>([]);
  const [videoCategories,setVideoCategories]=useState<string[]>([]);
  const [loading,setLoading]=useState(true);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [fileForm,setFileForm]=useState({title:"",category:"عام",description:"",file:null as File|null});
  const [quizForm,setQuizForm]=useState({title:"",category:"عام",description:"",passingScore:60,questions:[{prompt:"",options:["","","",""],correctIndex:0}] as Question[]});

  const load=async()=>{setLoading(true);try{const [s,f,q,a,v]=await Promise.all([adminApi<Student[]>("/api/admin/students"),adminApi<FileItem[]>("/api/admin/learning/files"),adminApi<Quiz[]>("/api/admin/learning/quizzes"),adminApi<Attempt[]>("/api/admin/learning/attempts"),adminApi<Array<{category:string}>>("/api/videos")]);setStudents(s);setFiles(f);setQuizzes(q);setAttempts(a);setVideoCategories(Array.from(new Set(v.map(item=>item.category).filter(Boolean))));}catch(e){toast({variant:"destructive",title:"خطأ",description:(e as Error).message});}finally{setLoading(false);}};
  useEffect(()=>{load();},[]);
  const updateStudent=async(id:number,status:string)=>{try{const updated=await adminApi<Student>(`/api/admin/students/${id}`,{method:"PATCH",body:JSON.stringify({status})});setStudents(students.map(s=>s.id===id?updated:s));toast({title:status==="approved"?"تم قبول الطالب وإصدار الكود":"تم تحديث حالة الطالب"});}catch(e){toast({variant:"destructive",description:(e as Error).message});}};
  const updateStudentCourses=async(student:Student,enrolledCategories:string[])=>{try{const updated=await adminApi<Student>(`/api/admin/students/${student.id}`,{method:"PATCH",body:JSON.stringify({enrolledCategories})});setStudents(students.map(s=>s.id===student.id?updated:s));toast({title:"تم تحديث كورسات الطالب"});}catch(e){toast({variant:"destructive",description:(e as Error).message});}};
  const deleteStudent=async(id:number)=>{if(!confirm("حذف الطالب وكل محاولاته؟"))return;await adminApi(`/api/admin/students/${id}`,{method:"DELETE"});setStudents(students.filter(s=>s.id!==id));};
  const uploadFile=async(e:React.FormEvent)=>{e.preventDefault();if(!fileForm.file)return;setIsUploadingFile(true);const body=new FormData();body.append("title",fileForm.title);body.append("category",fileForm.category);body.append("description",fileForm.description);body.append("file",fileForm.file);try{const created=await adminApi<FileItem>("/api/admin/learning/files",{method:"POST",body});setFiles([created,...files]);setFileForm({title:"",category:"عام",description:"",file:null});toast({title:"تم رفع الملف بنجاح"});}catch(e){toast({variant:"destructive",description:(e as Error).message});}finally{setIsUploadingFile(false);}};
  const deleteFile=async(id:number)=>{await adminApi(`/api/admin/learning/files/${id}`,{method:"DELETE"});setFiles(files.filter(f=>f.id!==id));};
  const toggleFile=async(file:FileItem)=>{const updated=await adminApi<FileItem>(`/api/admin/learning/files/${file.id}`,{method:"PATCH",body:JSON.stringify({isPublished:!file.isPublished})});setFiles(files.map(f=>f.id===file.id?updated:f));};
  const createQuiz=async(e:React.FormEvent)=>{e.preventDefault();try{const created=await adminApi<Quiz>("/api/admin/learning/quizzes",{method:"POST",body:JSON.stringify(quizForm)});setQuizzes([created,...quizzes]);setQuizForm({title:"",category:"عام",description:"",passingScore:60,questions:[{prompt:"",options:["","","",""],correctIndex:0}]});toast({title:"تم إنشاء الاختبار"});}catch(e){toast({variant:"destructive",description:(e as Error).message});}};
  const deleteQuiz=async(id:number)=>{await adminApi(`/api/admin/learning/quizzes/${id}`,{method:"DELETE"});setQuizzes(quizzes.filter(q=>q.id!==id));};
  const toggleQuiz=async(quiz:Quiz)=>{const updated=await adminApi<Quiz>(`/api/admin/learning/quizzes/${quiz.id}`,{method:"PATCH",body:JSON.stringify({isPublished:!quiz.isPublished})});setQuizzes(quizzes.map(q=>q.id===quiz.id?updated:q));};
  const setQuestion=(index:number,patch:Partial<Question>)=>setQuizForm({...quizForm,questions:quizForm.questions.map((q,i)=>i===index?{...q,...patch}:q)});
  const availableCategories=Array.from(new Set([...videoCategories,...files.map(file=>file.category),...quizzes.map(quiz=>quiz.category)])).filter(Boolean).sort((a,b)=>a.localeCompare(b,"ar"));
  const tabs=[['students','الطلاب',GraduationCap],['files','الملفات',FileText],['quizzes','الاختبارات',ClipboardCheck],['results','النتائج',Check]] as const;
  return <div className="space-y-6" dir="rtl"><div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"><div><h2 className="text-2xl font-black">إدارة المنصة التعليمية</h2><p className="text-sm text-muted-foreground">اعتماد الطلاب وإدارة الملفات والاختبارات والنتائج.</p></div><Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4"/> تحديث</Button></div><div className="flex flex-wrap gap-2 rounded-2xl border bg-card p-2">{tabs.map(([value,label,Icon])=><button key={value} onClick={()=>setTab(value)} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ${tab===value?'bg-primary text-primary-foreground':'text-muted-foreground hover:bg-muted'}`}><Icon className="h-4 w-4"/>{label}</button>)}</div>{loading?<div className="grid place-items-center py-24"><Loader2 className="animate-spin text-primary"/></div>:<>
  {tab==='students'&&<div className="space-y-3">{students.length===0?<Empty text="لا توجد طلبات تسجيل بعد"/>:students.map(s=><article key={s.id} className="rounded-2xl border bg-card p-5 space-y-4"><div className="flex flex-col xl:flex-row gap-4 xl:items-center justify-between"><div><div className="flex items-center gap-2"><h3 className="font-black text-lg">{s.name}</h3><Status status={s.status}/></div><p className="text-sm text-muted-foreground mt-1">{s.phone}{s.email?` · ${s.email}`:''}{s.governorate?` · المحافظة: ${s.governorate}`:''}{s.city?` · المدينة: ${s.city}`:''}{s.grade?` · المرحلة: ${s.grade === 'أخرى' ? s.otherGradeDetail || 'أخرى' : s.grade}`:''}</p>{s.accessCode&&<button onClick={()=>navigator.clipboard.writeText(s.accessCode!)} className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 font-mono text-primary"><Copy className="h-3.5 w-3.5"/>{s.accessCode}</button>}</div><div className="flex flex-wrap gap-2">{s.status!=='approved'&&<Button onClick={()=>updateStudent(s.id,'approved')}><UserCheck/> قبول وإصدار كود</Button>}{s.status==='approved'&&<Button variant="outline" onClick={()=>updateStudent(s.id,'suspended')}><UserX/> إيقاف</Button>}{s.status==='suspended'&&<Button variant="outline" onClick={()=>updateStudent(s.id,'approved')}><UserCheck/> إعادة تفعيل</Button>}<Button variant="destructive" onClick={()=>deleteStudent(s.id)}><Trash2/></Button></div></div><CourseAccess student={s} categories={availableCategories} onChange={(categories)=>updateStudentCourses(s,categories)}/></article>)}</div>}
  {tab==='files'&&<div className="grid xl:grid-cols-[360px_1fr] gap-6"><form onSubmit={uploadFile} className="rounded-2xl border bg-card p-5 space-y-4 h-fit"><h3 className="font-black text-lg">رفع ملف جديد</h3><Field label="عنوان الملف"><input required value={fileForm.title} onChange={e=>setFileForm({...fileForm,title:e.target.value})} className="input-admin"/></Field><Field label="التصنيف"><input value={fileForm.category} onChange={e=>setFileForm({...fileForm,category:e.target.value})} className="input-admin"/></Field><Field label="الوصف"><textarea value={fileForm.description} onChange={e=>setFileForm({...fileForm,description:e.target.value})} className="input-admin min-h-20"/></Field><Field label="الملف المرفق">
    {fileForm.file ? (
      <div className="space-y-3">
      <div className="flex items-center gap-3 p-3 bg-muted/50 border border-border rounded-xl">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary animate-pulse">
          <FileText className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0 text-right">
          <span className="block text-xs font-bold text-foreground truncate">{fileForm.file.name}</span>
          <span className="block text-[10px] text-muted-foreground">{(fileForm.file.size/1024/1024).toFixed(2)} MB</span>
        </div>
        <button
          type="button"
          onClick={() => setFileForm({...fileForm, file: null})}
          className="text-red-500 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <LocalFilePreview file={fileForm.file}/>
      </div>
    ) : (
      <div className="relative border border-dashed border-border hover:border-primary/50 rounded-xl p-6 bg-muted/20 hover:bg-muted/30 transition-colors flex flex-col items-center justify-center min-h-[120px] text-center cursor-pointer">
        <input 
          required 
          type="file" 
          onChange={e=>setFileForm({...fileForm,file:e.target.files?.[0]||null})} 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
        <span className="text-xs font-bold text-foreground">انقر هنا أو اسحب الملف لرفعه</span>
        <span className="text-[10px] text-muted-foreground mt-1">PDF, DOCX, ZIP حتى 150MB</span>
      </div>
    )}
  </Field><Button className="w-full" disabled={isUploadingFile}>{isUploadingFile ? <span className="flex items-center gap-2 justify-center"><Loader2 className="h-4 w-4 animate-spin"/> جاري الرفع...</span> : <span className="flex items-center gap-2 justify-center"><Upload className="h-4 w-4"/> رفع ونشر الملف</span>}</Button></form><div className="grid md:grid-cols-2 gap-4">{files.map(f=><article key={f.id} className="rounded-2xl border bg-card p-5"><FileText className="text-primary"/><h3 className="font-black mt-3">{f.title}</h3><p className="text-xs text-muted-foreground mt-1">{f.category} · {(f.sizeBytes/1024/1024).toFixed(1)} MB · {f.isPublished?'منشور':'مخفي'}</p><div className="mt-4 flex gap-2"><Button variant="outline" size="sm" onClick={()=>toggleFile(f)}>{f.isPublished?'إخفاء':'نشر'}</Button><Button variant="destructive" size="sm" onClick={()=>deleteFile(f.id)}><Trash2/> حذف</Button></div></article>)}</div></div>}
  {tab==='quizzes'&&<div className="grid xl:grid-cols-[1fr_320px] gap-6"><form onSubmit={createQuiz} className="rounded-2xl border bg-card p-5 space-y-5"><h3 className="font-black text-lg">إنشاء اختبار</h3><div className="grid sm:grid-cols-3 gap-3"><Field label="اسم الاختبار"><input required value={quizForm.title} onChange={e=>setQuizForm({...quizForm,title:e.target.value})} className="input-admin"/></Field><Field label="التصنيف"><input value={quizForm.category} onChange={e=>setQuizForm({...quizForm,category:e.target.value})} className="input-admin"/></Field><Field label="درجة النجاح %"><input type="number" min="0" max="100" value={quizForm.passingScore} onChange={e=>setQuizForm({...quizForm,passingScore:Number(e.target.value)})} className="input-admin"/></Field></div>{quizForm.questions.map((q,qi)=><div key={qi} className="rounded-2xl bg-muted/50 p-4 space-y-3"><div className="flex justify-between"><strong>السؤال {qi+1}</strong>{quizForm.questions.length>1&&<button type="button" onClick={()=>setQuizForm({...quizForm,questions:quizForm.questions.filter((_,i)=>i!==qi)})} className="text-red-500"><Trash2 className="h-4 w-4"/></button>}</div><input required placeholder="نص السؤال" value={q.prompt} onChange={e=>setQuestion(qi,{prompt:e.target.value})} className="input-admin"/><div className="grid sm:grid-cols-2 gap-2">{q.options.map((option,oi)=><label key={oi} className="flex items-center gap-2"><input type="radio" name={`correct-${qi}`} checked={q.correctIndex===oi} onChange={()=>setQuestion(qi,{correctIndex:oi})}/><input required placeholder={`الإجابة ${oi+1}`} value={option} onChange={e=>setQuestion(qi,{options:q.options.map((o,i)=>i===oi?e.target.value:o)})} className="input-admin"/></label>)}</div></div>)}<div className="flex gap-2"><Button type="button" variant="outline" onClick={()=>setQuizForm({...quizForm,questions:[...quizForm.questions,{prompt:"",options:["","","",""],correctIndex:0}]})}><Plus/> إضافة سؤال</Button><Button type="submit">نشر الاختبار</Button></div></form><div className="space-y-3">{quizzes.map(q=><article key={q.id} className="rounded-2xl border bg-card p-4"><h3 className="font-black">{q.title}</h3><p className="text-xs text-muted-foreground">{q.questions.length} سؤال · نجاح {q.passingScore}% · {q.isPublished?'منشور':'مخفي'}</p><div className="mt-3 flex gap-2"><Button variant="outline" size="sm" onClick={()=>toggleQuiz(q)}>{q.isPublished?'إخفاء':'نشر'}</Button><Button variant="destructive" size="sm" onClick={()=>deleteQuiz(q.id)}><Trash2/> حذف</Button></div></article>)}</div></div>}
  {tab==='results'&&<div className="overflow-x-auto rounded-2xl border bg-card"><table className="w-full text-sm"><thead className="bg-muted"><tr><th className="p-4 text-right">الطالب</th><th className="p-4 text-right">الاختبار</th><th className="p-4">النتيجة</th><th className="p-4">الحالة</th><th className="p-4">التاريخ</th></tr></thead><tbody>{attempts.map(a=><tr key={a.id} className="border-t"><td className="p-4 font-bold">{a.studentName}</td><td className="p-4">{a.quizTitle}</td><td className="p-4 text-center font-black">{a.score}%</td><td className="p-4 text-center">{a.passed?'ناجح':'لم ينجح'}</td><td className="p-4 text-center text-muted-foreground">{new Date(a.createdAt).toLocaleDateString('ar-EG')}</td></tr>)}</tbody></table></div>}
  </>}</div>;
}

function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block space-y-1.5"><span className="text-xs font-bold text-muted-foreground">{label}</span>{children}</label>}
function Status({status}:{status:string}){const map:Record<string,string>={pending:"قيد المراجعة",approved:"معتمد",suspended:"موقوف"};return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${status==='approved'?'bg-emerald-500/10 text-emerald-600':status==='suspended'?'bg-red-500/10 text-red-600':'bg-amber-500/10 text-amber-600'}`}>{map[status]||status}</span>}
function Empty({text}:{text:string}){return <div className="rounded-3xl border border-dashed p-20 text-center text-muted-foreground">{text}</div>}
function CourseAccess({student,categories,onChange}:{student:Student;categories:string[];onChange:(categories:string[])=>void}){const selected=student.enrolledCategories||[];return <div className="rounded-xl border bg-muted/30 p-4"><div className="mb-3"><strong className="text-sm">الكورسات المسموح بيها</strong><p className="text-xs text-muted-foreground">مرحلة الطالب بتتفتح تلقائيًا، واختار هنا أي كورسات إضافية.</p></div>{categories.length===0?<p className="text-xs text-muted-foreground">ارفع فيديو وحدد تصنيفه علشان يظهر هنا.</p>:<div className="flex flex-wrap gap-2">{categories.map(category=><label key={category} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold ${selected.includes(category)?'border-primary bg-primary/10 text-primary':'bg-background'}`}><input type="checkbox" checked={selected.includes(category)} onChange={()=>onChange(selected.includes(category)?selected.filter(item=>item!==category):[...selected,category])}/>{category}</label>)}</div>}</div>}
function LocalFilePreview({file}:{file:File}){const [url,setUrl]=useState("");useEffect(()=>{const next=URL.createObjectURL(file);setUrl(next);return()=>URL.revokeObjectURL(next);},[file]);if(!url)return null;if(file.type.startsWith("image/"))return <img src={url} alt={`معاينة ${file.name}`} className="max-h-64 w-full rounded-xl border bg-white object-contain"/>;if(file.type==="application/pdf"||file.type.startsWith("text/"))return <iframe src={url} title={`معاينة ${file.name}`} className="h-72 w-full rounded-xl border bg-white"/>;return <div className="rounded-xl border border-dashed bg-background p-4 text-center"><FileText className="mx-auto mb-2 text-primary"/><p className="text-xs font-bold">المتصفح مش بيدعم معاينة النوع ده، لكن الملف جاهز للرفع.</p><p className="mt-1 text-[10px] text-muted-foreground">{file.type||"نوع غير معروف"}</p></div>}
