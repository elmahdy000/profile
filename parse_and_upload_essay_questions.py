import re
import json
import sys
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

raw_text = """[UNIT]: Unit 1 – Information Technology and Society
[LESSON]: Lesson 1-1 – Development of Information Technology and Social Transformation
[QUESTION_1]
[PROMPT]: Explain the five major stages in the development of information technology and state the main impact of each stage.
[POINTS]: 5
[MODEL_ANSWER]:
1. 1940s–60s: Birth of the computer; mainly used for military and scientific computation.
2. 1970s–80s: Spread of personal computers (PCs); beginning of personal computer use.
3. 1990s: Commercialization of the Internet and the Web; globalization of information and spread of email.
4. 2000s: Rise of smartphones; explosive spread of mobile Internet.
5. 2010s onward: Spread of cloud computing; large-scale data analysis, AI, and “IT as a service.”
   [KEY_ELEMENTS]: The five time periods, their major technologies/events, and their impact on society.
[QUESTION_2]
[PROMPT]: Compare the role of computers in the 1940s–1960s with the role of personal computers in the 1970s–1980s.
[POINTS]: 5
[MODEL_ANSWER]:
1. In the 1940s–60s, early computers were mainly used for military and scientific computation.
2. Early computers were very large and could fill a whole room.
3. In the 1970s–80s, personal computers (PCs) became widespread.
4. This period marked the beginning of personal computer use.
   [KEY_ELEMENTS]: Military/scientific use, large early computers, spread of PCs, personal computer use.
[QUESTION_3]
[PROMPT]: Compare the contribution of the Internet and Web stage in the 1990s with the smartphone stage in the 2000s.
[POINTS]: 5
[MODEL_ANSWER]:
1. In the 1990s, the Internet was commercialized and the Web spread.
2. Information became global and email use expanded.
3. In the 2000s, smartphones rose in popularity.
4. Mobile Internet spread explosively.
   [KEY_ELEMENTS]: Internet/Web, globalization of information, email, smartphones, mobile Internet.
[QUESTION_4]
[PROMPT]: Explain the importance of cloud computing in the development of information technology from the 2010s onward.
[POINTS]: 5
[MODEL_ANSWER]:
1. Cloud computing spread from the 2010s onward.
2. It supported large-scale data analysis and AI.
3. “IT as a service” became widespread.
4. Cloud computing means IT delivered as a service over the Internet.
   [KEY_ELEMENTS]: Cloud computing, data analysis, AI, IT as a service, Internet.
[QUESTION_5]
[PROMPT]: Explain Moore’s Law and clarify what changes approximately every two years.
[POINTS]: 5
[MODEL_ANSWER]:
1. Moore’s Law is an empirical observation.
2. It states that the number of transistors on an integrated circuit doubles approximately every two years.
3. It remained largely accurate for many years.
4. Computing power increased dramatically.
   [KEY_ELEMENTS]: Empirical observation, number of transistors, integrated circuit, approximately every two years.
[QUESTION_6]
[PROMPT]: Explain why the continued miniaturization of transistors is becoming difficult.
[POINTS]: 5
[MODEL_ANSWER]:
1. Miniaturization of transistors is approaching a physical limit.
2. Quantum tunneling may occur, in which electrons slip through barriers.
3. Leakage current may occur, in which current escapes unintentionally.
4. This makes it difficult to achieve both higher performance and lower power consumption at the same time.
   [KEY_ELEMENTS]: Physical limit, quantum tunneling, leakage current, performance, power consumption.
[QUESTION_7]
[PROMPT]: Compare parallel processing and quantum computing as directions for improving computing performance when transistor miniaturization becomes more difficult.
[POINTS]: 5
[MODEL_ANSWER]:
1. Parallel processing uses multiple processor cores.
2. Quantum computers use the principles of quantum mechanics.
3. Both are new directions for performance improvement when transistor miniaturization becomes difficult.
   [KEY_ELEMENTS]: Multiple processor cores, quantum mechanics, new directions for performance improvement.
[QUESTION_8]
[PROMPT]: Explain five major social changes caused by the development of information technology.
[POINTS]: 5
[MODEL_ANSWER]:
1. Social Networking Service (SNS): allows users to connect, post, and share information.
2. E-commerce: buying and selling goods and services through the Internet.
3. Remote work: work performed from home or other remote locations using the Internet.
4. Online learning: classes and study materials delivered using the Internet.
5. Cashless payment: payments made using electronic money, QR codes, and similar methods without using cash.
   [KEY_ELEMENTS]: SNS, e-commerce, remote work, online learning, cashless payment.
[QUESTION_9]
[PROMPT]: Compare SNS and e-commerce in terms of their main purposes and their effects on society.
[POINTS]: 5
[MODEL_ANSWER]:
1. SNS allows users to connect with each other and post and share information.
2. SNS is highly effective at spreading information rapidly.
3. E-commerce means buying and selling goods and services through the Internet.
4. Examples of e-commerce include online shops such as Amazon and eBay.
   [KEY_ELEMENTS]: SNS definition/function, rapid information sharing, e-commerce definition, examples.
[QUESTION_10]
[PROMPT]: Compare remote work and online learning as examples of social change caused by information technology.
[POINTS]: 5
[MODEL_ANSWER]:
1. Remote work is a working style in which work is performed from home or other remote locations using the Internet.
2. Online learning is a learning style in which classes and study materials are delivered using the Internet.
3. Both depend on the Internet.
   [KEY_ELEMENTS]: Remote work definition, online learning definition, use of the Internet.
[QUESTION_11]
[PROMPT]: Explain how cashless payment illustrates the effect of information technology on daily life.
[POINTS]: 5
[MODEL_ANSWER]:
1. Cashless payment is a system for making payments without using cash.
2. It uses methods such as electronic money and QR codes.
3. Examples include credit cards, debit cards, and mobile payment apps.
   [KEY_ELEMENTS]: Payment without cash, electronic money/QR codes, correct examples.
[QUESTION_12]
[PROMPT]: Explain how an autonomous driving system operates from detecting its surroundings until controlling the vehicle.
[POINTS]: 5
[MODEL_ANSWER]:
1. Autonomous driving uses AI to drive a vehicle without human operation.
2. Cameras and sensors recognize the surroundings.
3. The system makes driving decisions.
4. The system controls the vehicle.
   [KEY_ELEMENTS]: AI, cameras and sensors, recognizing surroundings, decisions, vehicle control.
[QUESTION_13]
[PROMPT]: Justify the use of edge computing in autonomous driving systems.
[POINTS]: 5
[MODEL_ANSWER]:
1. A delay of even 0.1 seconds can lead to an accident.
2. Edge computing processes data instantly on the vehicle itself.
3. It avoids sending the data to the cloud for judgment.
4. The vehicle can make an immediate driving response.
   [KEY_ELEMENTS]: 0.1-second delay, processing on the vehicle, no waiting for cloud judgment, immediate response.
[QUESTION_14]
[PROMPT]: Compare cloud computing and edge computing, especially in the context of autonomous driving.
[POINTS]: 5
[MODEL_ANSWER]:
1. Cloud computing delivers IT as a service over the Internet.
2. Edge computing places processing on the device itself.
3. For an immediate driving response, an autonomous vehicle must not wait for a cloud decision.
   [KEY_ELEMENTS]: Cloud computing definition, edge computing definition, immediate autonomous-driving response.
[QUESTION_15]
[PROMPT]: A self-driving car suddenly detects an obstacle directly in front of it. Explain how the system should respond and why processing the decision locally is important.
[POINTS]: 5
[MODEL_ANSWER]:
1. Cameras and sensors recognize the surroundings.
2. The system makes a driving decision.
3. The system controls the vehicle.
4. Edge computing processes the data instantly on the vehicle itself.
5. The vehicle does not have to wait for a cloud decision.
   [KEY_ELEMENTS]: Recognition, decision, control, processing on the vehicle, no cloud delay.
[QUESTION_16]
[PROMPT]: Compare Augmented Reality (AR) and Virtual Reality (VR).
[POINTS]: 5
[MODEL_ANSWER]:
1. AR overlays digital information on real-world images.
2. In AR, the real world remains visible with a digital layer added.
3. VR allows users to immerse themselves in a virtual space generated by a computer.
4. VR provides a computer-generated environment.
   [KEY_ELEMENTS]: AR overlay, real world remains visible, VR immersion, computer-generated virtual space.
[QUESTION_17]
[PROMPT]: A learner uses one application that displays digital labels over a real object and another application that places the learner inside a computer-generated environment. Identify the technology used in each case and justify your answer.
[POINTS]: 5
[MODEL_ANSWER]:
1. The first application uses Augmented Reality (AR).
2. AR overlays digital information on real-world images.
3. The second application uses Virtual Reality (VR).
4. VR immerses the user in a virtual space generated by a computer.
   [KEY_ELEMENTS]: Correct identification of AR and VR with their definitions.
[QUESTION_18]
[PROMPT]: Explain the basic idea of quantum computing and how it differs conceptually from traditional computing.
[POINTS]: 5
[MODEL_ANSWER]:
1. Quantum computing uses the principles of quantum mechanics.
2. It is expected to dramatically speed up computations that are difficult or impossible for traditional computers.
3. A classical bit holds one state at a time.
4. A qubit uses quantum superposition.
   [KEY_ELEMENTS]: Quantum mechanics, difficult computations, classical bit, qubit, superposition.
[QUESTION_19]
[PROMPT]: Analyze and correct the following three misconceptions: “E-commerce means buying with cash in a physical store,” “Moore’s Law guarantees unlimited transistor miniaturization,” and “VR means faster computer processing.”
[POINTS]: 5
[MODEL_ANSWER]:
1. E-commerce means buying and selling goods and services through the Internet.
2. Moore’s Law does not guarantee unlimited miniaturization because transistor miniaturization is approaching a physical limit.
3. VR allows users to immerse themselves in a virtual space generated by a computer.
4. Faster difficult computations are associated with quantum computing.
   [KEY_ELEMENTS]: Correct meaning of e-commerce, physical limits of miniaturization, correct VR definition, quantum computing.
[QUESTION_20]
[PROMPT]: Analyze how the development of information technology has changed society from the early computer era to modern emerging technologies. Support your answer with examples from the lesson.
[POINTS]: 5
[MODEL_ANSWER]:
1. Early computers were mainly used for military and scientific computation.
2. Personal computers introduced personal computer use.
3. The Internet and Web globalized information and expanded email.
4. Smartphones caused the explosive spread of mobile Internet, while cloud computing supported data analysis, AI, and IT as a service.
5. Information technology also brought social changes and emerging technologies such as SNS, e-commerce, autonomous driving, AR/VR, and quantum computing.
   [KEY_ELEMENTS]: Historical stages, social changes, emerging technologies.
[QUESTION_21]
[PROMPT]: Explain the development of information technology from the 1940s to the 1960s, indicating its main use during that period.
[POINTS]: 5
[MODEL_ANSWER]:
1. ENIAC and vacuum-tube computers appeared.
2. Early computers could fill a whole room.
3. They were mainly used for military and scientific computation.
   [KEY_ELEMENTS]: ENIAC/vacuum-tube computers, large size, military and scientific computation.
[QUESTION_22]
[PROMPT]: Explain what is meant by "Moore's Law." Is it a fixed physical law? Justify your answer.
[POINTS]: 5
[MODEL_ANSWER]:
1. Moore’s Law is an empirical observation.
2. It states that the number of transistors on an integrated circuit doubles approximately every two years.
3. Continued miniaturization is approaching a physical limit.
4. Problems include quantum tunneling and leakage current.
   [KEY_ELEMENTS]: Empirical observation, transistor count, two years, physical limits.
[QUESTION_23]
[PROMPT]: Mention three social changes resulting from information technology.
[POINTS]: 5
[MODEL_ANSWER]:
1. Social Networking Services (SNS).
2. E-commerce.
3. Remote work.
4. Other correct examples from the lesson are online learning and cashless payment.
   [KEY_ELEMENTS]: Any three of the five social changes stated in the lesson.
[QUESTION_24]
[PROMPT]: What is meant by "e-commerce"? Explain with two examples.
[POINTS]: 5
[MODEL_ANSWER]:
1. E-commerce is buying and selling goods and services through the Internet.
2. Amazon is an example.
3. eBay is an example.
   [KEY_ELEMENTS]: Correct definition, Amazon, eBay.
[QUESTION_25]
[PROMPT]: Explain how edge computing enhances safety and decision speed in autonomous driving without the need to send data to the cloud.
[POINTS]: 5
[MODEL_ANSWER]:
1. A delay of even 0.1 seconds can lead to an accident.
2. Edge computing processes data instantly on the vehicle itself.
3. It does not send the data to the cloud for judgment.
4. This allows an immediate driving response.
   [KEY_ELEMENTS]: Delay risk, local processing, no cloud judgment, immediate response.
[QUESTION_26]
[PROMPT]: Briefly compare Augmented Reality (AR) and Virtual Reality (VR) in terms of definition and how each works.
[POINTS]: 5
[MODEL_ANSWER]:
1. AR overlays digital information on real-world images.
2. The real world remains visible with a digital layer added.
3. VR allows users to immerse themselves in a virtual space generated by a computer.
4. VR provides a computer-generated environment.
   [KEY_ELEMENTS]: AR definition, real-world layer, VR definition, virtual environment.
[QUESTION_27]
[PROMPT]: Explain the principle of the qubit in quantum computing and how it differs from the classical bit.
[POINTS]: 5
[MODEL_ANSWER]:
1. A classical bit holds one state.
2. A qubit uses quantum superposition.
3. Quantum computing uses the principles of quantum mechanics.
   [KEY_ELEMENTS]: Classical bit, qubit, superposition, quantum mechanics.
[QUESTION_28]
[PROMPT]: How did the spread of cloud computing from the 2010s onward change the way information-technology resources are provided?
[POINTS]: 5
[MODEL_ANSWER]:
1. Cloud computing spread from the 2010s onward.
2. “IT as a service” became widespread.
3. IT could be delivered as a service over the Internet.
4. Cloud computing supported large-scale data analysis and AI.
   [KEY_ELEMENTS]: 2010s onward, IT as a service, Internet, data analysis and AI.
[QUESTION_29]
[PROMPT]: Explain the historical stages in the development of information technology from the emergence of electronic computers in the 1940s through the 1960s, stating their main purpose at that time.
[POINTS]: 5
[MODEL_ANSWER]:
1. ENIAC and vacuum-tube computers appeared.
2. Early computers could fill a whole room.
3. Their main purpose was military and scientific computation.
   [KEY_ELEMENTS]: ENIAC/vacuum tubes, large computers, military and scientific computation.
[QUESTION_30]
[PROMPT]: Explain Moore's Law, what it describes, and the engineering and physical challenges facing continued miniaturization of circuit components.
[POINTS]: 5
[MODEL_ANSWER]:
1. Moore’s Law states that the number of transistors on an integrated circuit doubles approximately every two years.
2. Miniaturization of transistors is approaching a physical limit.
3. Quantum tunneling can occur when electrons slip through barriers.
4. Leakage current occurs when current escapes unintentionally.
5. These problems make it difficult to achieve both higher performance and lower power consumption at the same time.
   [KEY_ELEMENTS]: Moore’s Law, physical limit, quantum tunneling, leakage current, performance/power problem.
[QUESTION_31]
[PROMPT]: Enumerate the five social transformations resulting from information technology. Explain the meanings of remote work and e-commerce.
[POINTS]: 5
[MODEL_ANSWER]:
1. The five transformations are SNS, e-commerce, remote work, online learning, and cashless payment.
2. Remote work is a working style in which work is performed from home or other remote locations using the Internet.
3. E-commerce is buying and selling goods and services through the Internet.
   [KEY_ELEMENTS]: Five transformations, remote work definition, e-commerce definition.
[QUESTION_32]
[PROMPT]: Explain the characteristics and uses of the three notable emerging technologies in the lesson: autonomous driving, AR/VR, and quantum computing.
[POINTS]: 5
[MODEL_ANSWER]:
1. Autonomous driving uses AI to drive a vehicle without human operation.
2. Cameras and sensors recognize the surroundings, and the system makes decisions and controls the vehicle.
3. AR overlays digital information on real-world images.
4. VR immerses users in a virtual space generated by a computer.
5. Quantum computing uses principles of quantum mechanics to speed up difficult or impossible computations for traditional computers.
   [KEY_ELEMENTS]: Autonomous driving, AR, VR, quantum computing.
[QUESTION_33]
[PROMPT]: Explain how the emergence of personal computers (PCs) and the spread of access to information and email affected society in the 1970s and 1980s.
[POINTS]: 5
[MODEL_ANSWER]:
1. Personal computers (PCs) became widespread in the 1970s–80s.
2. This marked the beginning of personal computer use.
3. The globalization of information and spread of email occurred in the 1990s with the commercialization of the Internet and the Web.
   [KEY_ELEMENTS]: PCs in the 1970s–80s, beginning of personal computer use, correct placement of information/email in the 1990s.
[QUESTION_34]
[PROMPT]: Explain how continued miniaturization of circuit components under Moore's Law creates engineering and physical challenges such as leakage current, quantum effects, and quantum tunneling.
[POINTS]: 5
[MODEL_ANSWER]:
1. Miniaturization of transistors is approaching a physical limit.
2. Quantum tunneling occurs when electrons slip through barriers.
3. Leakage current occurs when current escapes unintentionally.
4. These problems make it difficult to achieve higher performance and lower power consumption at the same time.
   [KEY_ELEMENTS]: Physical limit, quantum tunneling, leakage current, performance and power consumption.
[QUESTION_35]
[PROMPT]: Briefly explain Social Networking Services (SNS), online learning, and cashless payment as social transformations.
[POINTS]: 5
[MODEL_ANSWER]:
1. SNS allows users to connect with each other and post and share information.
2. SNS is highly effective at spreading information rapidly.
3. Online learning is a learning style in which classes and study materials are delivered using the Internet.
4. Cashless payment is a system for making payments without using cash.
5. Examples include credit cards, debit cards, and mobile payment apps.
   [KEY_ELEMENTS]: SNS, online learning, cashless payment, examples.
[QUESTION_36]
[PROMPT]: Explain how edge computing processes data locally and instantly on board an autonomous vehicle to reduce response time and improve safety.
[POINTS]: 5
[MODEL_ANSWER]:
1. Edge computing processes data instantly on the vehicle itself.
2. It does not send the data to the cloud for judgment.
3. A delay of even 0.1 seconds can lead to an accident.
4. The vehicle must not wait for a cloud decision when an immediate driving response is required.
   [KEY_ELEMENTS]: Processing on the vehicle, no cloud judgment, delay risk, immediate response.
[QUESTION_37]
[PROMPT]: Discuss the impact of the Web and the spread of the Internet in the 1990s on the commercial and global availability of information.
[POINTS]: 5
[MODEL_ANSWER]:
1. The Internet was commercialized in the 1990s.
2. The Web spread.
3. Information became global.
4. Email use expanded.
   [KEY_ELEMENTS]: Commercialization of the Internet, Web, global information, email.
[QUESTION_38]
[PROMPT]: Explain why autonomous driving is considered a notable emerging technology.
[POINTS]: 5
[MODEL_ANSWER]:
1. Autonomous driving uses AI to drive a vehicle without human operation.
2. Cameras and sensors recognize the surroundings.
3. The system makes driving decisions.
4. The system controls the vehicle.
5. Edge computing can process data instantly on the vehicle itself.
   [KEY_ELEMENTS]: AI, no human operation, cameras/sensors, decisions and control, edge computing.
[QUESTION_39]
[PROMPT]: Explain the concepts of e-commerce and cashless payment.
[POINTS]: 5
[MODEL_ANSWER]:
1. E-commerce is buying and selling goods and services through the Internet.
2. Examples include online shops such as Amazon and eBay.
3. Cashless payment is a system for making payments without using cash.
4. Examples include credit cards, debit cards, and mobile payment apps.
   [KEY_ELEMENTS]: E-commerce definition/examples, cashless payment definition/examples.
[QUESTION_40]
[PROMPT]: Explain the fundamental differences between the classical bit and the qubit, using the concept of quantum superposition.
[POINTS]: 5
[MODEL_ANSWER]:
1. A classical bit holds one state.
2. A qubit uses quantum superposition.
3. Quantum computing uses the principles of quantum mechanics.
4. It is expected to speed up computations that are difficult or impossible for traditional computers.
   [KEY_ELEMENTS]: Classical bit, qubit, superposition, quantum mechanics.
"""

# Parsing logic
unit_match = re.search(r'\[UNIT\]:\s*(.+)', raw_text)
lesson_match = re.search(r'\[LESSON\]:\s*(.+)', raw_text)

unit_name = unit_match.group(1).strip() if unit_match else "Unit 1 – Information Technology and Society"
lesson_name = lesson_match.group(1).strip() if lesson_match else "Lesson 1-1 – Development of Information Technology and Social Transformation"

print(f"الوحدة: {unit_name}")
print(f"الدرس: {lesson_name}")

# Split by [QUESTION_X]
question_blocks = re.split(r'\[QUESTION_\d+\]', raw_text)[1:]
print(f"عدد الأسئلة المكتشفة: {len(question_blocks)}")

parsed_questions = []
for idx, block in enumerate(question_blocks, start=1):
    prompt_m = re.search(r'\[PROMPT\]:\s*(.+?)(?=\[POINTS\]|\[MODEL_ANSWER\]|$)', block, re.DOTALL)
    points_m = re.search(r'\[POINTS\]:\s*(\d+)', block)
    ans_m = re.search(r'\[MODEL_ANSWER\]:\s*(.+?)(?=\[KEY_ELEMENTS\]|$)', block, re.DOTALL)
    key_m = re.search(r'\[KEY_ELEMENTS\]:\s*(.+?)(?=\[QUESTION_|\Z)', block, re.DOTALL)

    prompt = prompt_m.group(1).strip() if prompt_m else ""
    points = int(points_m.group(1)) if points_m else 5
    model_answer = ans_m.group(1).strip() if ans_m else ""
    key_elements = key_m.group(1).strip() if key_m else ""

    q_obj = {
        "id": f"eq-{idx}",
        "prompt": prompt,
        "points": points,
        "modelAnswer": model_answer,
        "explanation": f"Key Elements / Grading Guide: {key_elements}" if key_elements else "",
        "unit": unit_name,
        "lesson": lesson_name
    }
    parsed_questions.append(q_obj)

print(f"تم تحليل {len(parsed_questions)} سؤالاً بنجاح.")

# 1. حفظها محلياً في ملف JSON منظم
with open("essay_bank_unit1_lesson1.json", "w", encoding="utf-8") as f:
    json.dump({
        "unit": unit_name,
        "lesson": lesson_name,
        "course_id": 18,
        "video_id": 23,
        "total_questions": len(parsed_questions),
        "questions": parsed_questions
    }, f, ensure_ascii=False, indent=2)

print("✅ تم حفظ بنك الأسئلة المقالية محلياً في: essay_bank_unit1_lesson1.json")

# 2. إدخالها في جدول essay_exams على السيرفر
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

def q_exec(sql):
    stdin, stdout, stderr = c.exec_command('su - postgres -c "psql -d profile -t -A"')
    stdin.write(sql)
    stdin.close()
    return stdout.read().decode('utf-8', errors='replace'), stderr.read().decode('utf-8', errors='replace')

# Format questions for EssayQuestion interface (id, prompt, points, modelAnswer, explanation)
db_questions = [
    {
        "id": q["id"],
        "prompt": q["prompt"],
        "points": q["points"],
        "modelAnswer": q["modelAnswer"],
        "explanation": q["explanation"]
    }
    for q in parsed_questions
]

exam_title = "Essay Exam: Unit 1 - Lesson 1-1 (Development of IT & Society)".replace("'", "''")
exam_desc = "Comprehensive written/essay assessment covering historical IT stages, Moore''s Law, social transformation, and emerging technologies.".replace("'", "''")
total_pts = sum(q["points"] for q in db_questions)
json_str = json.dumps(db_questions, ensure_ascii=False).replace("'", "''")

insert_sql = f"""
INSERT INTO essay_exams (
    course_id, video_id, title, description, stage, stages, category,
    duration_minutes, total_points, questions, allow_image_upload, is_published
) VALUES (
    18, 23,
    '{exam_title}',
    '{exam_desc}',
    'تانية بكالوريا لغات',
    '["تانية بكالوريا لغات"]'::jsonb,
    'تانية بكالوريا لغات',
    60,
    {total_pts},
    '{json_str}'::jsonb,
    true,
    true
)
RETURNING id;
"""

out, err = q_exec(insert_sql)
if err and "ERROR" in err:
    print("خطأ أثناء الإدخال في قاعدة البيانات:", err)
else:
    print(f"🎉 تم بنجاح إنشاء الامتحان المقالي في المنصة برقم معرف (ID): {out.strip()}")

c.close()
