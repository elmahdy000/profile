import json
import os

RAW_DATA = {
  "metadata": {
    "system": "Languages Schools",
    "title": "Strict Definitions Only — Verified Against English Textbook and English Assessments",
    "review_policy": "Only explicitly defined terms and named concepts with a direct glossary/table description. Exclude stages, examples, process steps, duplicates, and outside-curriculum terms.",
    "original_records": 137,
    "total_units": 4,
    "total_lessons": 14,
    "source_files": [
      "Programming-ArtificialIntelligence-En-EB-part1.pdf",
      "Programming-ArtificialIntelligence-En-EB-Assessments-1.pdf"
    ],
    "approved_original": 95,
    "excluded_original": 42,
    "new_unit4_definitions": 28,
    "total_definitions": 123
  },
  "units": [
    {
      "unit_number": 1,
      "unit_title_en": "Unit 1: Information Technology and Society",
      "unit_title_ar": "الوحدة الأولى: تكنولوجيا المعلومات والمجتمع",
      "total_definitions": 37,
      "lessons": [
        {
          "unit_number": 1,
          "unit_title_en": "Unit 1: Information Technology and Society",
          "unit_title_ar": "الوحدة الأولى: تكنولوجيا المعلومات والمجتمع",
          "lesson_number": 1,
          "lesson_title_en": "Lesson 1-1: Development of Information Technology and Social Transformation",
          "lesson_title_ar": "الدرس الأول: تطور تكنولوجيا المعلومات والتحول الاجتماعي",
          "total_definitions": 12,
          "approved_definitions_count": 12,
          "definitions": [
            {
              "id": "DEF-006",
              "term_en": "Moore's Law",
              "current_definition_en": "The empirical observation that the number of transistors on an integrated circuit doubles approximately every two years.",
              "updated_definition_en": "The empirical observation that the number of transistors on an integrated circuit doubles approximately every two years.",
              "official_term_en": "Moore's Law",
              "term_corrected": False,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 6,
                "printed_page": 5,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-007",
              "term_en": "SNS (Social Networking Service)",
              "current_definition_en": "Services that allow users to connect with each other and post and share information. They are highly effective at spreading information rapidly.",
              "updated_definition_en": "Services that allow users to connect with each other and post and share information. They are highly effective at spreading information rapidly.",
              "official_term_en": "SNS (Social Networking Service)",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 7,
                "printed_page": 6,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-008",
              "term_en": "E-commerce (EC)",
              "current_definition_en": "Buying and selling goods and services through the Internet.",
              "updated_definition_en": "Buying and selling goods and services through the Internet.",
              "official_term_en": "E-commerce (EC)",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 7,
                "printed_page": 6,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-009",
              "term_en": "Remote work",
              "current_definition_en": "A working style in which work is performed from home or other remote locations using the Internet.",
              "updated_definition_en": "A working style in which work is performed from home or other remote locations using the Internet.",
              "official_term_en": "Remote work",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 7,
                "printed_page": 6,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-010",
              "term_en": "Online learning",
              "current_definition_en": "A learning style in which classes and study materials are delivered using the Internet.",
              "updated_definition_en": "A learning style in which classes and study materials are delivered using the Internet.",
              "official_term_en": "Online learning",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 7,
                "printed_page": 6,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-011",
              "term_en": "Cashless payment",
              "current_definition_en": "A system for making payments using electronic money, QR codes, etc., without using cash.",
              "updated_definition_en": "A system for making payments using electronic money, QR codes, etc., without using cash.",
              "official_term_en": "Cashless payment",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 7,
                "printed_page": 6,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-012",
              "term_en": "Autonomous driving",
              "current_definition_en": "A technology that uses AI to drive a vehicle without human operation. It uses cameras and sensors to recognize the surroundings, makes driving decisions, and controls a vehicle.",
              "updated_definition_en": "A technology that uses AI to drive a vehicle without human operation. It uses cameras and sensors to recognize the surroundings, makes driving decisions, and controls a vehicle.",
              "official_term_en": "Autonomous driving",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 8,
                "printed_page": 7,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-013",
              "term_en": "Edge computing",
              "current_definition_en": "Processing data on the device itself, instantly, instead of sending it to the cloud.",
              "updated_definition_en": "Processing data on the device itself, instantly, instead of sending it to the cloud.",
              "official_term_en": "Edge computing",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 8,
                "printed_page": 7,
                "basis": "key_term"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-014",
              "term_en": "AR (Augmented Reality)",
              "current_definition_en": "A technology that overlays digital information on real-world images.",
              "updated_definition_en": "A technology that overlays digital information on real-world images.",
              "official_term_en": "AR (Augmented Reality)",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 8,
                "printed_page": 7,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-015",
              "term_en": "VR (Virtual Reality)",
              "current_definition_en": "A technology that allows users to immerse themselves in a virtual space generated by a computer.",
              "updated_definition_en": "A technology that allows users to immerse themselves in a virtual space generated by a computer.",
              "official_term_en": "VR (Virtual Reality)",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 8,
                "printed_page": 7,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-016",
              "term_en": "Quantum computing",
              "current_definition_en": "A technology expected to dramatically speed up computations that are difficult or impossible for traditional computers, by using the principles of quantum mechanics.",
              "updated_definition_en": "A technology expected to dramatically speed up computations that are difficult or impossible for traditional computers, by using the principles of quantum mechanics.",
              "official_term_en": "Quantum computing",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 8,
                "printed_page": 7,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-017",
              "term_en": "Cloud computing",
              "current_definition_en": "IT delivered as a service over the Internet.",
              "updated_definition_en": "IT delivered as a service over the Internet.",
              "official_term_en": "Cloud computing",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 11,
                "printed_page": 10,
                "basis": "key_term"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            }
          ]
        },
        {
          "unit_number": 1,
          "unit_title_en": "Unit 1: Information Technology and Society",
          "unit_title_ar": "الوحدة الأولى: تكنولوجيا المعلومات والمجتمع",
          "lesson_number": 2,
          "lesson_title_en": "Lesson 1-2: How AI Works",
          "lesson_title_ar": "الدرس الثاني: كيف يعمل الذكاء الاصطناعي",
          "total_definitions": 8,
          "approved_definitions_count": 8,
          "definitions": [
            {
              "id": "DEF-020",
              "term_en": "AI (Artificial Intelligence)",
              "current_definition_en": "A general term for technologies that reproduce or perform intelligent human behavior (learning, reasoning, judgment, etc.) on a computer.",
              "updated_definition_en": "A general term for technologies that reproduce or perform intelligent human behavior (learning, reasoning, judgment, etc.) on a computer.",
              "official_term_en": "AI (Artificial Intelligence)",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 14,
                "printed_page": 13,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-021",
              "term_en": "Machine Learning",
              "current_definition_en": "One of the learning technologies that makes AI work. It learns patterns from data to make predictions and judgments.",
              "updated_definition_en": "One of the learning technologies that makes AI work. It learns patterns from data to make predictions and judgments.",
              "official_term_en": "Machine Learning",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 15,
                "printed_page": 14,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-022",
              "term_en": "Deep Learning",
              "current_definition_en": "An advanced technology within machine learning that uses neural networks. It learns complex patterns using large-scale data.",
              "updated_definition_en": "An advanced technology within machine learning that uses neural networks. It learns complex patterns using large-scale data.",
              "official_term_en": "Deep Learning",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 15,
                "printed_page": 14,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-023",
              "term_en": "Neural network",
              "current_definition_en": "A system modeled after the workings of the nerve cells (neurons) of the human brain. By connecting many components, it learns from data and becomes capable of making complex judgments.",
              "updated_definition_en": "A system modeled after the workings of the nerve cells (neurons) of the human brain. By connecting many components, it learns from data and becomes capable of making complex judgments.",
              "official_term_en": "Neural network",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 15,
                "printed_page": 14,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-025",
              "term_en": "Hidden layers",
              "current_definition_en": "Layers between the input layer and the output layer of an artificial neural network.",
              "updated_definition_en": "Layers between the input layer and the output layer of an artificial neural network.",
              "official_term_en": "Hidden layers",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-Assessments-1.pdf",
                "pdf_page": 15,
                "printed_page": 15,
                "basis": "assessment_supported_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-026",
              "term_en": "Generative AI",
              "current_definition_en": "AI technology that uses deep learning to generate new data (text, images, audio, programs, etc.).",
              "updated_definition_en": "AI technology that uses deep learning to generate new data (text, images, audio, programs, etc.).",
              "official_term_en": "Generative AI",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 15,
                "printed_page": 14,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-027",
              "term_en": "Narrow AI",
              "current_definition_en": "An AI system specialized in one task or a limited set of tasks.",
              "updated_definition_en": "An AI system specialized in one task or a limited set of tasks.",
              "official_term_en": "Narrow AI",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 14,
                "printed_page": 13,
                "basis": "key_term"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-028",
              "term_en": "Hallucination",
              "current_definition_en": "When generative AI produces text that sounds plausible but is factually incorrect.",
              "updated_definition_en": "When generative AI produces text that sounds plausible but is factually incorrect.",
              "official_term_en": "Hallucination",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 17,
                "printed_page": 16,
                "basis": "explained_term"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            }
          ]
        },
        {
          "unit_number": 1,
          "unit_title_en": "Unit 1: Information Technology and Society",
          "unit_title_ar": "الوحدة الأولى: تكنولوجيا المعلومات والمجتمع",
          "lesson_number": 3,
          "lesson_title_en": "Lesson 1-3: AI in Daily Life and Industry",
          "lesson_title_ar": "الدرس الثالث: الذكاء الاصطناعي في الحياة اليومية والصناعة",
          "total_definitions": 7,
          "approved_definitions_count": 7,
          "definitions": [
            {
              "id": "DEF-029",
              "term_en": "Recommendation system",
              "current_definition_en": "A system that predicts preferences from past behavior data and displays recommendations.",
              "updated_definition_en": "A system that predicts preferences from past behavior data and displays recommendations.",
              "official_term_en": "Recommendation system",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 21,
                "printed_page": 20,
                "basis": "table_description"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-030",
              "term_en": "Voice assistant",
              "current_definition_en": "A system that recognizes a voice, understands commands, and executes them.",
              "updated_definition_en": "A system that recognizes a voice, understands commands, and executes them.",
              "official_term_en": "Voice assistant",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 21,
                "printed_page": 20,
                "basis": "table_description"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-031",
              "term_en": "Machine translation",
              "current_definition_en": "Automatically translates text into different languages.",
              "updated_definition_en": "Automatically translates text into different languages.",
              "official_term_en": "Machine translation",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 21,
                "printed_page": 20,
                "basis": "table_description"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-032",
              "term_en": "Face recognition",
              "current_definition_en": "Automatically detects and identifies human faces in photographs.",
              "updated_definition_en": "Automatically detects and identifies human faces in photographs.",
              "official_term_en": "Face recognition",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 21,
                "printed_page": 20,
                "basis": "table_description"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-033",
              "term_en": "Image-diagnosis AI",
              "current_definition_en": "AI used in healthcare to detect diseases from X-ray and CT images.",
              "updated_definition_en": "AI used in healthcare to detect diseases from X-ray and CT images.",
              "official_term_en": "Image-diagnosis AI",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 22,
                "printed_page": 21,
                "basis": "table_description"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-034",
              "term_en": "Predictive maintenance",
              "current_definition_en": "Using AI to predict when machines will fail, supporting maintenance before a failure occurs.",
              "updated_definition_en": "Using AI to predict when machines will fail, supporting maintenance before a failure occurs.",
              "official_term_en": "Predictive maintenance",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 22,
                "printed_page": 21,
                "basis": "defined_in_explanation"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-036",
              "term_en": "Black-box problem",
              "current_definition_en": "When it is unclear how an AI reached its judgment.",
              "updated_definition_en": "When it is unclear how an AI reached its judgment.",
              "official_term_en": "Black-box problem",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 22,
                "printed_page": 21,
                "basis": "key_term"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            }
          ]
        },
        {
          "unit_number": 1,
          "unit_title_en": "Unit 1: Information Technology and Society",
          "unit_title_ar": "الوحدة الأولى: تكنولوجيا المعلومات والمجتمع",
          "lesson_number": 4,
          "lesson_title_en": "Lesson 1-4: Ethical Issues with AI",
          "lesson_title_ar": "الدرس الرابع: القضايا الأخلاقية للذكاء الاصطناعي",
          "total_definitions": 10,
          "approved_definitions_count": 10,
          "definitions": [
            {
              "id": "DEF-037",
              "term_en": "Algorithmic bias",
              "current_definition_en": "Bias in AI judgments caused by bias in the training data.",
              "updated_definition_en": "Bias in AI judgments caused by bias in the training data.",
              "official_term_en": "Algorithmic bias",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 28,
                "printed_page": 27,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-038",
              "term_en": "Training data",
              "current_definition_en": "The examples from which an AI system learns its patterns before use.",
              "updated_definition_en": "The examples from which an AI system learns its patterns before use.",
              "official_term_en": "Training data",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-Assessments-1.pdf",
                "pdf_page": 24,
                "printed_page": 24,
                "basis": "assessment_supported_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-041",
              "term_en": "Privacy",
              "current_definition_en": "Control over which personal data is shared.",
              "updated_definition_en": "Control over which personal data is shared.",
              "official_term_en": "Privacy",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 29,
                "printed_page": 28,
                "basis": "key_term"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-042",
              "term_en": "Explainable AI (XAI)",
              "current_definition_en": "Technology that makes it possible for humans to understand why an AI made a particular judgment.",
              "updated_definition_en": "Technology that makes it possible for humans to understand why an AI made a particular judgment.",
              "official_term_en": "Explainable AI (XAI)",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 29,
                "printed_page": 28,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-044",
              "term_en": "Responsibility",
              "current_definition_en": "The question of who is responsible when an AI makes an incorrect judgment.",
              "updated_definition_en": "The question of who is responsible when an AI makes an incorrect judgment.",
              "official_term_en": "Responsibility",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 29,
                "printed_page": 28,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-045",
              "term_en": "Fairness",
              "current_definition_en": "Not unjustly discriminating against any particular person or group.",
              "updated_definition_en": "Not unjustly discriminating against any particular person or group.",
              "official_term_en": "Fairness",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 29,
                "printed_page": 28,
                "basis": "principle_description"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-046",
              "term_en": "Transparency",
              "current_definition_en": "Showing the AI's decision-making process and inner workings clearly.",
              "updated_definition_en": "Showing the AI's decision-making process and inner workings clearly.",
              "official_term_en": "Transparency",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 29,
                "printed_page": 28,
                "basis": "principle_description"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-047",
              "term_en": "Privacy protection",
              "current_definition_en": "Handling personal information appropriately and protecting privacy.",
              "updated_definition_en": "Handling personal information appropriately and protecting privacy.",
              "official_term_en": "Privacy protection",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 29,
                "printed_page": 28,
                "basis": "principle_description"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-048",
              "term_en": "Accountability",
              "current_definition_en": "Being answerable for the AI's decisions.",
              "updated_definition_en": "Being answerable for the AI's decisions.",
              "official_term_en": "Accountability",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 29,
                "printed_page": 28,
                "basis": "principle_description"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-049",
              "term_en": "Proxy variable",
              "current_definition_en": "A variable that indirectly stands in for a protected attribute.",
              "updated_definition_en": "A variable that indirectly stands in for a protected attribute.",
              "official_term_en": "Proxy variable",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 28,
                "printed_page": 27,
                "basis": "defined_in_explanation"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            }
          ]
        }
      ]
    },
    {
      "unit_number": 2,
      "unit_title_en": "Unit 2: Cybersecurity",
      "unit_title_ar": "الوحدة الثانية: الأمن السيبراني",
      "total_definitions": 28,
      "lessons": [
        {
          "unit_number": 2,
          "unit_title_en": "Unit 2: Cybersecurity",
          "unit_title_ar": "الوحدة الثانية: الأمن السيبراني",
          "lesson_number": 5,
          "lesson_title_en": "Lesson 2-1: Cryptographic Technologies and Authentication",
          "lesson_title_ar": "الدرس الأول: تقنيات التشفير والمصادقة",
          "total_definitions": 14,
          "approved_definitions_count": 14,
          "definitions": [
            {
              "id": "DEF-050",
              "term_en": "HTTPS (HTTP Secure)",
              "current_definition_en": "A communication protocol that adds TLS encryption to HTTP. It provides encryption, tamper detection, and verification of the communication partner.",
              "updated_definition_en": "A communication protocol that adds TLS encryption to HTTP. It provides encryption, tamper detection, and verification of the communication partner.",
              "official_term_en": "HTTPS (HTTP Secure)",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 35,
                "printed_page": 34,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-051",
              "term_en": "TLS handshake",
              "current_definition_en": "The procedure for establishing secure HTTPS communication.",
              "updated_definition_en": "The procedure for establishing secure HTTPS communication.",
              "official_term_en": "TLS handshake",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 35,
                "printed_page": 34,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-052",
              "term_en": "Public-key cryptography",
              "current_definition_en": "Cryptography using public and private keys to safely share a common key for communication.",
              "updated_definition_en": "Cryptography using public and private keys to safely share a common key for communication.",
              "official_term_en": "Public-key cryptography",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 35,
                "printed_page": 34,
                "basis": "defined_in_explanation"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-053",
              "term_en": "Common-key (symmetric-key) cryptography",
              "current_definition_en": "Cryptography that uses a shared common key to encrypt and exchange data quickly.",
              "updated_definition_en": "Cryptography that uses a shared common key to encrypt and exchange data quickly.",
              "official_term_en": "Common-key (symmetric-key) cryptography",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 35,
                "printed_page": 34,
                "basis": "defined_in_explanation"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-054",
              "term_en": "Public key and private key",
              "current_definition_en": "A public key locks; a different private key unlocks. For digital signatures, the private key signs and the public key verifies.",
              "updated_definition_en": "A public key locks; a different private key unlocks. For digital signatures, the private key signs and the public key verifies.",
              "official_term_en": "Public key and private key",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 35,
                "printed_page": 34,
                "basis": "key_term"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-058",
              "term_en": "Encryption",
              "current_definition_en": "Prevents communication content from being read by third parties.",
              "updated_definition_en": "Prevents communication content from being read by third parties.",
              "official_term_en": "Encryption",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 37,
                "printed_page": 36,
                "basis": "table_description"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-059",
              "term_en": "Digital signature",
              "current_definition_en": "Detects data tampering or impersonation of the sender, and provides non-repudiation.",
              "updated_definition_en": "Detects data tampering or impersonation of the sender, and provides non-repudiation.",
              "official_term_en": "Digital signature",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 37,
                "printed_page": 36,
                "basis": "table_description"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-060",
              "term_en": "Digital certificate",
              "current_definition_en": "Verifies that the communication partner is authentic.",
              "updated_definition_en": "Verifies that the communication partner is authentic.",
              "official_term_en": "Digital certificate",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 37,
                "printed_page": 36,
                "basis": "table_description"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-061",
              "term_en": "Certificate authority (CA)",
              "current_definition_en": "A trusted authority that vouches that a site is genuine when the browser verifies its certificate.",
              "updated_definition_en": "A trusted authority that vouches that a site is genuine when the browser verifies its certificate.",
              "official_term_en": "Certificate authority (CA)",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 37,
                "printed_page": 36,
                "basis": "key_term"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-062",
              "term_en": "Multi-factor authentication",
              "current_definition_en": "Combining two or more of the three factors of authentication: knowledge, possession, and biometric.",
              "updated_definition_en": "Combining two or more of the three factors of authentication: knowledge, possession, and biometric.",
              "official_term_en": "Multi-factor authentication",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 36,
                "printed_page": 35,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-063",
              "term_en": "Two-factor authentication (2FA)",
              "current_definition_en": "Using two independent factors from different categories to verify identity.",
              "updated_definition_en": "Using two independent factors from different categories to verify identity.",
              "official_term_en": "Two-factor authentication (2FA)",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-Assessments-1.pdf",
                "pdf_page": 33,
                "printed_page": 33,
                "basis": "assessment_supported_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-064",
              "term_en": "Knowledge factor",
              "current_definition_en": "An authentication factor based on knowledge, such as a password.",
              "updated_definition_en": "An authentication factor based on knowledge, such as a password.",
              "official_term_en": "Knowledge factor",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 36,
                "printed_page": 35,
                "basis": "defined_in_example"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-065",
              "term_en": "Possession factor",
              "current_definition_en": "An authentication factor based on possession, such as a smartphone receiving a one-time password or a smart card.",
              "updated_definition_en": "An authentication factor based on possession, such as a smartphone receiving a one-time password or a smart card.",
              "official_term_en": "Possession factor",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 36,
                "printed_page": 35,
                "basis": "defined_in_example"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-066",
              "term_en": "Biometric factor",
              "current_definition_en": "An authentication factor based on biometric traits, such as a fingerprint.",
              "updated_definition_en": "An authentication factor based on biometric traits, such as a fingerprint.",
              "official_term_en": "Biometric factor",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 36,
                "printed_page": 35,
                "basis": "defined_in_example"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            }
          ]
        },
        {
          "unit_number": 2,
          "unit_title_en": "Unit 2: Cybersecurity",
          "unit_title_ar": "الوحدة الثانية: الأمن السيبراني",
          "lesson_number": 6,
          "lesson_title_en": "Lesson 2-2: Network Security Design",
          "lesson_title_ar": "الدرس الثاني: تصميم أمن الشبكات",
          "total_definitions": 5,
          "approved_definitions_count": 5,
          "definitions": [
            {
              "id": "DEF-067",
              "term_en": "Firewall",
              "current_definition_en": "A system installed at the entry/exit point of a network that allows or denies communication based on rules set in advance.",
              "updated_definition_en": "A system installed at the entry/exit point of a network that allows or denies communication based on rules set in advance.",
              "official_term_en": "Firewall",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 43,
                "printed_page": 42,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-068",
              "term_en": "VPN (Virtual Private Network)",
              "current_definition_en": "A technology that creates an encrypted virtual private line (tunnel) over the Internet, allowing safe connection to a network from a remote location.",
              "updated_definition_en": "A technology that creates an encrypted virtual private line (tunnel) over the Internet, allowing safe connection to a network from a remote location.",
              "official_term_en": "VPN (Virtual Private Network)",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 43,
                "printed_page": 42,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-071",
              "term_en": "DMZ (Demilitarized Zone)",
              "current_definition_en": "An area where servers exposed to the external network (web servers, mail servers, etc.) are placed separately from the internal network.",
              "updated_definition_en": "An area where servers exposed to the external network (web servers, mail servers, etc.) are placed separately from the internal network.",
              "official_term_en": "DMZ (Demilitarized Zone)",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 43,
                "printed_page": 42,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-072",
              "term_en": "Defense in depth",
              "current_definition_en": "The concept of layering multiple security measures so that, even if one measure is breached, the next can still protect the system.",
              "updated_definition_en": "The concept of layering multiple security measures so that, even if one measure is breached, the next can still protect the system.",
              "official_term_en": "Defense in depth",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 44,
                "printed_page": 43,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-077",
              "term_en": "Zero trust",
              "current_definition_en": "A security concept that means the system does not trust any communication, including from within the organization's network, and always verifies it.",
              "updated_definition_en": "A security concept that means the system does not trust any communication, including from within the organization's network, and always verifies it.",
              "official_term_en": "Zero trust",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 44,
                "printed_page": 43,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            }
          ]
        },
        {
          "unit_number": 2,
          "unit_title_en": "Unit 2: Cybersecurity",
          "unit_title_ar": "الوحدة الثانية: الأمن السيبراني",
          "lesson_number": 7,
          "lesson_title_en": "Lesson 2-3: Incident Response and Risk Management",
          "lesson_title_ar": "الدرس الثالث: الاستجابة للحوادث وإدارة المخاطر",
          "total_definitions": 9,
          "approved_definitions_count": 9,
          "definitions": [
            {
              "id": "DEF-080",
              "term_en": "Security incident",
              "current_definition_en": "A situation in which actual damage occurs due to an information security problem.",
              "updated_definition_en": "A situation in which actual damage occurs due to an information security problem.",
              "official_term_en": "Security incident",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 50,
                "printed_page": 49,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-081",
              "term_en": "Information leak",
              "current_definition_en": "Personal information or confidential information is leaked to the outside.",
              "updated_definition_en": "Personal information or confidential information is leaked to the outside.",
              "official_term_en": "Information leak",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 50,
                "printed_page": 49,
                "basis": "table_description"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-082",
              "term_en": "Data tampering",
              "current_definition_en": "Data within a system is altered without authorization.",
              "updated_definition_en": "Data within a system is altered without authorization.",
              "official_term_en": "Data tampering",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 50,
                "printed_page": 49,
                "basis": "table_description"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-083",
              "term_en": "Service outage",
              "current_definition_en": "A service becomes unavailable due to attacks on the server, etc.",
              "updated_definition_en": "A service becomes unavailable due to attacks on the server, etc.",
              "official_term_en": "Service outage",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 50,
                "printed_page": 49,
                "basis": "table_description"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-084",
              "term_en": "Incident response",
              "current_definition_en": "A six-stage process for responding to a security incident: preparation, detection, containment, eradication, recovery, and prevention of recurrence.",
              "updated_definition_en": "A six-stage process for responding to a security incident: preparation, detection, containment, eradication, recovery, and prevention of recurrence.",
              "official_term_en": "Incident response",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 50,
                "printed_page": 49,
                "basis": "defined_in_explanation"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-091",
              "term_en": "Risk",
              "current_definition_en": "The possibility of an information security problem occurring in the future, and its impact.",
              "updated_definition_en": "The possibility of an information security problem occurring in the future, and its impact.",
              "official_term_en": "Risk",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 51,
                "printed_page": 50,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-092",
              "term_en": "Impact",
              "current_definition_en": "How much damage occurs if the risk actually materializes.",
              "updated_definition_en": "How much damage occurs if the risk actually materializes.",
              "official_term_en": "Impact",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 51,
                "printed_page": 50,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-093",
              "term_en": "Likelihood",
              "current_definition_en": "How high the probability is that the risk will actually materialize.",
              "updated_definition_en": "How high the probability is that the risk will actually materialize.",
              "official_term_en": "Likelihood",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 51,
                "printed_page": 50,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-096",
              "term_en": "Risk evaluation matrix",
              "current_definition_en": "A matrix for evaluating and prioritizing risks based on impact and likelihood. Risks high in both factors are addressed first.",
              "updated_definition_en": "A matrix for evaluating and prioritizing risks based on impact and likelihood. Risks high in both factors are addressed first.",
              "official_term_en": "Risk evaluation matrix",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 51,
                "printed_page": 50,
                "basis": "figure_explained_concept"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            }
          ]
        }
      ]
    },
    {
      "unit_number": 3,
      "unit_title_en": "Unit 3: Web Applications",
      "unit_title_ar": "الوحدة الثالثة: تطبيقات الويب",
      "total_definitions": 30,
      "lessons": [
        {
          "unit_number": 3,
          "unit_title_en": "Unit 3: Web Applications",
          "unit_title_ar": "الوحدة الثالثة: تطبيقات الويب",
          "lesson_number": 8,
          "lesson_title_en": "Lesson 3-1: The Overall Structure of Web Applications",
          "lesson_title_ar": "الدرس الأول: البنية العامة لتطبيقات الويب",
          "total_definitions": 5,
          "approved_definitions_count": 5,
          "definitions": [
            {
              "id": "DEF-097",
              "term_en": "Web application",
              "current_definition_en": "An application used through a web browser. It can be used as long as you have a browser, without needing to install dedicated software.",
              "updated_definition_en": "An application used through a web browser. It can be used as long as you have a browser, without needing to install dedicated software.",
              "official_term_en": "Web application",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 57,
                "printed_page": 56,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-098",
              "term_en": "Frontend",
              "current_definition_en": "The screen component that users see directly. It runs on the browser and accepts user input.",
              "updated_definition_en": "The screen component that users see directly. It runs on the browser and accepts user input.",
              "official_term_en": "Frontend",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 57,
                "printed_page": 56,
                "basis": "table_description"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-099",
              "term_en": "Backend",
              "current_definition_en": "The server-side processing that users do not see. It processes data and makes decisions.",
              "updated_definition_en": "The server-side processing that users do not see. It processes data and makes decisions.",
              "official_term_en": "Backend",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 57,
                "printed_page": 56,
                "basis": "table_description"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-100",
              "term_en": "Database",
              "current_definition_en": "A system that organizes, stores, and manages data. It retrieves data when needed and records new data.",
              "updated_definition_en": "A system that organizes, stores, and manages data. It retrieves data when needed and records new data.",
              "official_term_en": "Database",
              "term_corrected": False,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 57,
                "printed_page": 56,
                "basis": "table_description"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-101",
              "term_en": "Three-tier architecture",
              "current_definition_en": "A web application architecture composed of three cooperating tiers: frontend, backend, and database.",
              "updated_definition_en": "A web application architecture composed of three cooperating tiers: frontend, backend, and database.",
              "official_term_en": "Three-tier architecture",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 57,
                "printed_page": 56,
                "basis": "defined_in_explanation"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            }
          ]
        },
        {
          "unit_number": 3,
          "unit_title_en": "Unit 3: Web Applications",
          "unit_title_ar": "الوحدة الثالثة: تطبيقات الويب",
          "lesson_number": 9,
          "lesson_title_en": "Lesson 3-2: Web Application Communication Methods",
          "lesson_title_ar": "الدرس الثاني: طرق الاتصال في تطبيقات الويب",
          "total_definitions": 14,
          "approved_definitions_count": 14,
          "definitions": [
            {
              "id": "DEF-102",
              "term_en": "Client",
              "current_definition_en": "The side that requests data or processing from the server. Web browsers and smartphone apps fall into this category.",
              "updated_definition_en": "The side that requests data or processing from the server. Web browsers and smartphone apps fall into this category.",
              "official_term_en": "Client",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 64,
                "printed_page": 63,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-103",
              "term_en": "Server",
              "current_definition_en": "The side that receives requests from clients, processes them, and returns responses.",
              "updated_definition_en": "The side that receives requests from clients, processes them, and returns responses.",
              "official_term_en": "Server",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 64,
                "printed_page": 63,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-104",
              "term_en": "Client-server communication",
              "current_definition_en": "A web application operates by the client sending a request and the server returning a response.",
              "updated_definition_en": "A web application operates by the client sending a request and the server returning a response.",
              "official_term_en": "Client-server communication",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 64,
                "printed_page": 63,
                "basis": "defined_in_explanation"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-105",
              "term_en": "HTTP (HyperText Transfer Protocol)",
              "current_definition_en": "A communication protocol for exchanging data between clients (browsers and apps) and servers.",
              "updated_definition_en": "A communication protocol for exchanging data between clients (browsers and apps) and servers.",
              "official_term_en": "HTTP (HyperText Transfer Protocol)",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 64,
                "printed_page": 63,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-106",
              "term_en": "HTTPS (HTTP Secure)",
              "current_definition_en": "A communication protocol that adds TLS encryption to HTTP, reducing the risk of communication content being read by third parties.",
              "updated_definition_en": "A communication protocol that adds TLS encryption to HTTP, reducing the risk of communication content being read by third parties.",
              "official_term_en": "HTTPS (HTTP Secure)",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 64,
                "printed_page": 63,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-107",
              "term_en": "HTTP method",
              "current_definition_en": "Information included in an HTTP request that indicates what kind of operation is desired.",
              "updated_definition_en": "Information included in an HTTP request that indicates what kind of operation is desired.",
              "official_term_en": "HTTP method",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 64,
                "printed_page": 63,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-108",
              "term_en": "GET",
              "current_definition_en": "Retrieve data from the server.",
              "updated_definition_en": "Retrieve data from the server.",
              "official_term_en": "GET",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 65,
                "printed_page": 64,
                "basis": "table_description"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-109",
              "term_en": "POST",
              "current_definition_en": "Send data to the server.",
              "updated_definition_en": "Send data to the server.",
              "official_term_en": "POST",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 65,
                "printed_page": 64,
                "basis": "table_description"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-112",
              "term_en": "Status code",
              "current_definition_en": "A number included in a server response that indicates the result of processing.",
              "updated_definition_en": "A number included in a server response that indicates the result of processing.",
              "official_term_en": "Status code",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 65,
                "printed_page": 64,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-113",
              "term_en": "Status code 200",
              "current_definition_en": "Success: the request was processed successfully.",
              "updated_definition_en": "Success: the request was processed successfully.",
              "official_term_en": "Status code 200",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 65,
                "printed_page": 64,
                "basis": "table_description"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-114",
              "term_en": "Status code 404",
              "current_definition_en": "Page not found: the specified URL does not exist.",
              "updated_definition_en": "Page not found: the specified URL does not exist.",
              "official_term_en": "Status code 404",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 65,
                "printed_page": 64,
                "basis": "table_description"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-115",
              "term_en": "Status code 500",
              "current_definition_en": "Server error: a problem occurred on the server side.",
              "updated_definition_en": "Server error: a problem occurred on the server side.",
              "official_term_en": "Status code 500",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 65,
                "printed_page": 64,
                "basis": "table_description"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-116",
              "term_en": "API (Application Programming Interface)",
              "current_definition_en": "A system for exchanging data between different pieces of software.",
              "updated_definition_en": "A system for exchanging data between different pieces of software.",
              "official_term_en": "API (Application Programming Interface)",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 65,
                "printed_page": 64,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-118",
              "term_en": "JSON (JavaScript Object Notation)",
              "current_definition_en": "A data format that is easy for humans to read and for computers to process.",
              "updated_definition_en": "A data format that is easy for humans to read and for computers to process.",
              "official_term_en": "JSON (JavaScript Object Notation)",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 65,
                "printed_page": 64,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            }
          ]
        },
        {
          "unit_number": 3,
          "unit_title_en": "Unit 3: Web Applications",
          "unit_title_ar": "الوحدة الثالثة: تطبيقات الويب",
          "lesson_number": 10,
          "lesson_title_en": "Lesson 3-3: Fundamentals of Frontend Technology",
          "lesson_title_ar": "الدرس الثالث: أساسيات تكنولوجيا الواجهة الأمامية",
          "total_definitions": 11,
          "approved_definitions_count": 11,
          "definitions": [
            {
              "id": "DEF-119",
              "term_en": "HTML",
              "current_definition_en": "Defines the structure (skeleton) of a web page. Describes elements such as headings, paragraphs, images, and links.",
              "updated_definition_en": "Defines the structure (skeleton) of a web page. Describes elements such as headings, paragraphs, images, and links.",
              "official_term_en": "HTML",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 70,
                "printed_page": 69,
                "basis": "table_description"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-120",
              "term_en": "CSS",
              "current_definition_en": "Specifies the appearance of a web page (colors, layout, size, fonts, etc.).",
              "updated_definition_en": "Specifies the appearance of a web page (colors, layout, size, fonts, etc.).",
              "official_term_en": "CSS",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 70,
                "printed_page": 69,
                "basis": "table_description"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-121",
              "term_en": "JavaScript",
              "current_definition_en": "Adds behavior and interactivity to a web page. Activates responses when buttons are pressed and updates only part of the screen.",
              "updated_definition_en": "Adds behavior and interactivity to a web page. Activates responses when buttons are pressed and updates only part of the screen.",
              "official_term_en": "JavaScript",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 70,
                "printed_page": 69,
                "basis": "table_description"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-122",
              "term_en": "Semantic HTML",
              "current_definition_en": "The concept of describing each part of a web page using element names (tags) that indicate their meaning.",
              "updated_definition_en": "The concept of describing each part of a web page using element names (tags) that indicate their meaning.",
              "official_term_en": "Semantic HTML",
              "term_corrected": False,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 71,
                "printed_page": 70,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-127",
              "term_en": "Accessibility",
              "current_definition_en": "Making websites usable by people with disabilities.",
              "updated_definition_en": "Making websites usable by people with disabilities.",
              "official_term_en": "Accessibility",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-Assessments-1.pdf",
                "pdf_page": 69,
                "printed_page": 69,
                "basis": "assessment_supported_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-131",
              "term_en": "Responsive design",
              "current_definition_en": "A design concept in which the layout is automatically adjusted according to different screen sizes such as PCs, smartphones, and tablets.",
              "updated_definition_en": "A design concept in which the layout is automatically adjusted according to different screen sizes such as PCs, smartphones, and tablets.",
              "official_term_en": "Responsive design",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 71,
                "printed_page": 70,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-132",
              "term_en": "Mobile-first",
              "current_definition_en": "Prioritizing small screens such as smartphones from the design stage.",
              "updated_definition_en": "Prioritizing small screens such as smartphones from the design stage.",
              "official_term_en": "Mobile-first",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 71,
                "printed_page": 70,
                "basis": "defined_in_explanation"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-133",
              "term_en": "Framework",
              "current_definition_en": "A structure that provides commonly used functions and components in advance, in order to make web application development more efficient.",
              "updated_definition_en": "A structure that provides commonly used functions and components in advance, in order to make web application development more efficient.",
              "official_term_en": "Framework",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 71,
                "printed_page": 70,
                "basis": "direct_definition"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-134",
              "term_en": "React",
              "current_definition_en": "A frontend framework developed by Meta (formerly Facebook). It efficiently updates part of the screen and is suited to large-scale web applications.",
              "updated_definition_en": "A frontend framework developed by Meta (formerly Facebook). It efficiently updates part of the screen and is suited to large-scale web applications.",
              "official_term_en": "React",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 71,
                "printed_page": 70,
                "basis": "table_description"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-136",
              "term_en": "Vue",
              "current_definition_en": "A frontend framework with a simple structure that allows web applications to be built incrementally from small features.",
              "updated_definition_en": "A frontend framework with a simple structure that allows web applications to be built incrementally from small features.",
              "official_term_en": "Vue",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 71,
                "printed_page": 70,
                "basis": "table_description"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            },
            {
              "id": "DEF-137",
              "term_en": "Next.js",
              "current_definition_en": "A frontend framework that adds mechanisms for faster page display to React features.",
              "updated_definition_en": "A frontend framework that adds mechanisms for faster page display to React features.",
              "official_term_en": "Next.js",
              "term_corrected": True,
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 71,
                "printed_page": 70,
                "basis": "table_description"
              },
              "review_note": "Use official_term_en + updated_definition_en in the definitions bank; preserve original fields for audit."
            }
          ]
        }
      ]
    },
    {
      "unit_number": 4,
      "unit_title_en": "Unit 4: Web and Media Design",
      "unit_title_ar": "الوحدة الرابعة: تصميم الويب والوسائط",
      "total_definitions": 28,
      "total_lessons": 4,
      "lessons": [
        {
          "unit_number": 4,
          "unit_title_en": "Unit 4: Web and Media Design",
          "unit_title_ar": "الوحدة الرابعة: تصميم الويب والوسائط",
          "lesson_number": 11,
          "lesson_title_en": "Lesson 4-1: Types and Characteristics of Media",
          "lesson_title_ar": "الدرس الأول: أنواع الوسائط وخصائصها",
          "total_definitions": 2,
          "approved_definitions_count": 2,
          "definitions": [
            {
              "id": "DEF-138",
              "term_en": "One-way interaction",
              "current_definition_en": "Communication from sender to receiver only.",
              "updated_definition_en": "Communication from sender to receiver only.",
              "official_term_en": "One-way interaction",
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 77,
                "printed_page": 76,
                "basis": "key_term"
              }
            },
            {
              "id": "DEF-139",
              "term_en": "Two-way interaction",
              "current_definition_en": "Communication in which users can respond and share.",
              "updated_definition_en": "Communication in which users can respond and share.",
              "official_term_en": "Two-way interaction",
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 77,
                "printed_page": 76,
                "basis": "key_term"
              }
            }
          ]
        },
        {
          "unit_number": 4,
          "unit_title_en": "Unit 4: Web and Media Design",
          "unit_title_ar": "الوحدة الرابعة: تصميم الويب والوسائط",
          "lesson_number": 12,
          "lesson_title_en": "Lesson 4-2: Information Design and User Experience for Websites",
          "lesson_title_ar": "الدرس الثاني: تصميم المعلومات وتجربة المستخدم للمواقع الإلكترونية",
          "total_definitions": 10,
          "approved_definitions_count": 10,
          "definitions": [
            {
              "id": "DEF-140",
              "term_en": "Persona",
              "current_definition_en": "A typical user image of those who will use the website, set up as a concrete person. Details such as age, occupation, purpose, and challenges are selected.",
              "updated_definition_en": "A typical user image of those who will use the website, set up as a concrete person. Details such as age, occupation, purpose, and challenges are selected.",
              "official_term_en": "Persona",
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 83,
                "printed_page": 82,
                "basis": "direct_definition"
              }
            },
            {
              "id": "DEF-141",
              "term_en": "Wireframe",
              "current_definition_en": "A rough blueprint of the layout of a web page. It does not include color or design decoration and is created to determine the placement and priority of information.",
              "updated_definition_en": "A rough blueprint of the layout of a web page. It does not include color or design decoration and is created to determine the placement and priority of information.",
              "official_term_en": "Wireframe",
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 83,
                "printed_page": 82,
                "basis": "direct_definition"
              }
            },
            {
              "id": "DEF-142",
              "term_en": "Four principles of design (CRAP)",
              "current_definition_en": "Contrast, Repetition, Alignment, and Proximity: four principles followed by designs that are easy to view and understand.",
              "updated_definition_en": "Contrast, Repetition, Alignment, and Proximity: four principles followed by designs that are easy to view and understand.",
              "official_term_en": "Four principles of design (CRAP)",
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 84,
                "printed_page": 83,
                "basis": "defined_in_explanation"
              }
            },
            {
              "id": "DEF-143",
              "term_en": "Contrast",
              "current_definition_en": "Make the priority of information clear and immediately highlight the most important elements.",
              "updated_definition_en": "Make the priority of information clear and immediately highlight the most important elements.",
              "official_term_en": "Contrast",
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 84,
                "printed_page": 83,
                "basis": "table_description"
              }
            },
            {
              "id": "DEF-144",
              "term_en": "Repetition",
              "current_definition_en": "Repeat specific characteristics so that the whole design has consistency, allowing users to navigate without getting lost.",
              "updated_definition_en": "Repeat specific characteristics so that the whole design has consistency, allowing users to navigate without getting lost.",
              "official_term_en": "Repetition",
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 84,
                "printed_page": 83,
                "basis": "table_description"
              }
            },
            {
              "id": "DEF-145",
              "term_en": "Alignment",
              "current_definition_en": "Align the position of each element to a common baseline, giving order to the entire screen.",
              "updated_definition_en": "Align the position of each element to a common baseline, giving order to the entire screen.",
              "official_term_en": "Alignment",
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 84,
                "printed_page": 83,
                "basis": "table_description"
              }
            },
            {
              "id": "DEF-146",
              "term_en": "Proximity",
              "current_definition_en": "Place related information close together so that it can be perceived as a single group at a glance.",
              "updated_definition_en": "Place related information close together so that it can be perceived as a single group at a glance.",
              "official_term_en": "Proximity",
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 84,
                "printed_page": 83,
                "basis": "table_description"
              }
            },
            {
              "id": "DEF-147",
              "term_en": "User-Centered Design (UCD)",
              "current_definition_en": "A design approach that designs websites and services from the perspective of the user, rather than the convenience of the creator.",
              "updated_definition_en": "A design approach that designs websites and services from the perspective of the user, rather than the convenience of the creator.",
              "official_term_en": "User-Centered Design (UCD)",
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 84,
                "printed_page": 83,
                "basis": "direct_definition"
              }
            },
            {
              "id": "DEF-148",
              "term_en": "Usability",
              "current_definition_en": "How easily users can navigate a website and achieve their goals.",
              "updated_definition_en": "How easily users can navigate a website and achieve their goals.",
              "official_term_en": "Usability",
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-Assessments-1.pdf",
                "pdf_page": 69,
                "printed_page": 69,
                "basis": "assessment_supported_definition"
              }
            },
            {
              "id": "DEF-149",
              "term_en": "Accessibility",
              "current_definition_en": "Designing content and interfaces so that people with disabilities can use and interact with the website.",
              "updated_definition_en": "Designing content and interfaces so that people with disabilities can use and interact with the website.",
              "official_term_en": "Accessibility",
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-Assessments-1.pdf",
                "pdf_page": 69,
                "printed_page": 69,
                "basis": "assessment_supported_definition"
              }
            }
          ]
        },
        {
          "unit_number": 4,
          "unit_title_en": "Unit 4: Web and Media Design",
          "unit_title_ar": "الوحدة الرابعة: تصميم الويب والوسائط",
          "lesson_number": 13,
          "lesson_title_en": "Lesson 4-3: Methods for Evaluating Websites",
          "lesson_title_ar": "الدرس الثالث: طرق تقييم المواقع الإلكترونية",
          "total_definitions": 12,
          "approved_definitions_count": 12,
          "definitions": [
            {
              "id": "DEF-150",
              "term_en": "Qualitative evaluation",
              "current_definition_en": "Explores in depth the reasons behind users’ psychology and behavior and evaluates qualitative aspects that cannot be expressed in numbers.",
              "updated_definition_en": "Explores in depth the reasons behind users’ psychology and behavior and evaluates qualitative aspects that cannot be expressed in numbers.",
              "official_term_en": "Qualitative evaluation",
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 90,
                "printed_page": 89,
                "basis": "table_description"
              }
            },
            {
              "id": "DEF-151",
              "term_en": "Quantitative evaluation",
              "current_definition_en": "Uses numerical data such as access counts and time and evaluates the current state objectively and statistically.",
              "updated_definition_en": "Uses numerical data such as access counts and time and evaluates the current state objectively and statistically.",
              "official_term_en": "Quantitative evaluation",
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 90,
                "printed_page": 89,
                "basis": "table_description"
              }
            },
            {
              "id": "DEF-152",
              "term_en": "Usability testing",
              "current_definition_en": "Observing actual user operations to identify points that are hard to use.",
              "updated_definition_en": "Observing actual user operations to identify points that are hard to use.",
              "official_term_en": "Usability testing",
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 90,
                "printed_page": 89,
                "basis": "table_description"
              }
            },
            {
              "id": "DEF-153",
              "term_en": "Interviews",
              "current_definition_en": "Hearing users’ direct voices to understand their needs and dissatisfactions.",
              "updated_definition_en": "Hearing users’ direct voices to understand their needs and dissatisfactions.",
              "official_term_en": "Interviews",
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 90,
                "printed_page": 89,
                "basis": "table_description"
              }
            },
            {
              "id": "DEF-154",
              "term_en": "Web analytics",
              "current_definition_en": "A technique for analyzing how a website is accessed using numerical values.",
              "updated_definition_en": "A technique for analyzing how a website is accessed using numerical values.",
              "official_term_en": "Web analytics",
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 90,
                "printed_page": 89,
                "basis": "direct_definition"
              }
            },
            {
              "id": "DEF-155",
              "term_en": "PV (Page View)",
              "current_definition_en": "The total number of times a page has been viewed.",
              "updated_definition_en": "The total number of times a page has been viewed.",
              "official_term_en": "PV (Page View)",
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 91,
                "printed_page": 90,
                "basis": "table_description"
              }
            },
            {
              "id": "DEF-156",
              "term_en": "Bounce rate",
              "current_definition_en": "The proportion of visits that ended after viewing only the first page.",
              "updated_definition_en": "The proportion of visits that ended after viewing only the first page.",
              "official_term_en": "Bounce rate",
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 91,
                "printed_page": 90,
                "basis": "table_description"
              }
            },
            {
              "id": "DEF-157",
              "term_en": "Conversion rate (CVR)",
              "current_definition_en": "The proportion of visits that achieved a target action (purchase, registration, etc.).",
              "updated_definition_en": "The proportion of visits that achieved a target action (purchase, registration, etc.).",
              "official_term_en": "Conversion rate (CVR)",
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 91,
                "printed_page": 90,
                "basis": "table_description"
              }
            },
            {
              "id": "DEF-158",
              "term_en": "Heuristic evaluation",
              "current_definition_en": "A method in which experts identify problems in a website’s user interface based on rules of thumb (heuristics).",
              "updated_definition_en": "A method in which experts identify problems in a website’s user interface based on rules of thumb (heuristics).",
              "official_term_en": "Heuristic evaluation",
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 91,
                "printed_page": 90,
                "basis": "direct_definition"
              }
            },
            {
              "id": "DEF-159",
              "term_en": "Consistency",
              "current_definition_en": "Whether the design and operations are unified across the site.",
              "updated_definition_en": "Whether the design and operations are unified across the site.",
              "official_term_en": "Consistency",
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 91,
                "printed_page": 90,
                "basis": "table_description"
              }
            },
            {
              "id": "DEF-160",
              "term_en": "Error prevention",
              "current_definition_en": "Whether the design makes it hard for users to make mistakes.",
              "updated_definition_en": "Whether the design makes it hard for users to make mistakes.",
              "official_term_en": "Error prevention",
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 91,
                "printed_page": 90,
                "basis": "table_description"
              }
            },
            {
              "id": "DEF-161",
              "term_en": "Visibility of system status",
              "current_definition_en": "Whether system status is clearly indicated to users (e.g., processing indicators, input error messages).",
              "updated_definition_en": "Whether system status is clearly indicated to users (e.g., processing indicators, input error messages).",
              "official_term_en": "Visibility of system status",
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 91,
                "printed_page": 90,
                "basis": "table_description"
              }
            }
          ]
        },
        {
          "unit_number": 4,
          "unit_title_en": "Unit 4: Web and Media Design",
          "unit_title_ar": "الوحدة الرابعة: تصميم الويب والوسائط",
          "lesson_number": 14,
          "lesson_title_en": "Lesson 4-4: The Iterative Improvement Process for Websites",
          "lesson_title_ar": "الدرس الرابع: عملية التحسين التكراري للمواقع",
          "total_definitions": 4,
          "approved_definitions_count": 4,
          "definitions": [
            {
              "id": "DEF-162",
              "term_en": "PDCA cycle",
              "current_definition_en": "A method that continuously advances improvement by repeating four steps: Plan, Do, Check, Act.",
              "updated_definition_en": "A method that continuously advances improvement by repeating four steps: Plan, Do, Check, Act.",
              "official_term_en": "PDCA cycle",
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 97,
                "printed_page": 96,
                "basis": "direct_definition"
              }
            },
            {
              "id": "DEF-163",
              "term_en": "Continuous improvement",
              "current_definition_en": "Getting better a little at a time.",
              "updated_definition_en": "Getting better a little at a time.",
              "official_term_en": "Continuous improvement",
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 97,
                "printed_page": 96,
                "basis": "key_term"
              }
            },
            {
              "id": "DEF-164",
              "term_en": "Design thinking",
              "current_definition_en": "A way of thinking that leads to discovering problems and generating solutions from the perspective of the user.",
              "updated_definition_en": "A way of thinking that leads to discovering problems and generating solutions from the perspective of the user.",
              "official_term_en": "Design thinking",
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 98,
                "printed_page": 97,
                "basis": "direct_definition"
              }
            },
            {
              "id": "DEF-165",
              "term_en": "A/B testing",
              "current_definition_en": "A method in which two patterns (option A and option B) are prepared, each is shown to actual users, and data is examined to determine which is more effective.",
              "updated_definition_en": "A method in which two patterns (option A and option B) are prepared, each is shown to actual users, and data is examined to determine which is more effective.",
              "official_term_en": "A/B testing",
              "review_status": "APPROVED_TEXTBOOK_DEFINITION",
              "source": {
                "file": "Programming-ArtificialIntelligence-En-EB-part1.pdf",
                "pdf_page": 98,
                "printed_page": 97,
                "basis": "direct_definition"
              }
            }
          ]
        }
      ]
    }
  ]
}

def main():
    base_dir = r"d:\profile\curriculum_definitions\languages_schools"
    by_lesson_dir = os.path.join(base_dir, "by_lesson")
    os.makedirs(by_lesson_dir, exist_ok=True)

    # 1. Write master all_languages_definitions.json
    all_defs_path = os.path.join(base_dir, "all_languages_definitions.json")
    with open(all_defs_path, "w", encoding="utf-8") as f:
        json.dump(RAW_DATA, f, ensure_ascii=False, indent=2)
    print(f"Master file saved: {all_defs_path}")

    # 2. Write 4 separate Unit JSON files
    for unit in RAW_DATA["units"]:
        u_num = unit["unit_number"]
        u_file = os.path.join(base_dir, f"unit_{u_num}_definitions_en.json")
        with open(u_file, "w", encoding="utf-8") as f:
            json.dump(unit, f, ensure_ascii=False, indent=2)
        print(f"Unit {u_num} saved ({unit['total_definitions']} definitions): {u_file}")

    # 3. Write 14 separate Lesson JSON files in by_lesson/
    # Map lesson numbers to clean english filenames
    lesson_filenames = {
        1: "01_Lesson_1_1_Development_of_Information_Technology.json",
        2: "02_Lesson_1_2_How_AI_Works.json",
        3: "03_Lesson_1_3_AI_in_Daily_Life_and_Industry.json",
        4: "04_Lesson_1_4_Ethical_Issues_with_AI.json",
        5: "05_Lesson_2_1_Cryptographic_Technologies_and_Authentication.json",
        6: "06_Lesson_2_2_Network_Security_Design.json",
        7: "07_Lesson_2_3_Incident_Response_and_Risk_Management.json",
        8: "08_Lesson_3_1_Overall_Structure_of_Web_Applications.json",
        9: "09_Lesson_3_2_Web_Application_Communication_Methods.json",
        10: "10_Lesson_3_3_Fundamentals_of_Frontend_Technology.json",
        11: "11_Lesson_4_1_Types_and_Characteristics_of_Media.json",
        12: "12_Lesson_4_2_Information_Design_and_UX.json",
        13: "13_Lesson_4_3_Methods_for_Evaluating_Websites.json",
        14: "14_Lesson_4_4_Iterative_Improvement_Process.json"
    }

    # Clean existing by_lesson directory
    for existing in os.listdir(by_lesson_dir):
        if existing.endswith(".json"):
            os.remove(os.path.join(by_lesson_dir, existing))

    total_lessons_written = 0
    total_defs_written = 0

    for unit in RAW_DATA["units"]:
        for lesson in unit["lessons"]:
            num = lesson["lesson_number"]
            fname = lesson_filenames.get(num, f"{num:02d}_lesson.json")
            l_path = os.path.join(by_lesson_dir, fname)
            with open(l_path, "w", encoding="utf-8") as f:
                json.dump(lesson, f, ensure_ascii=False, indent=2)
            total_lessons_written += 1
            total_defs_written += len(lesson["definitions"])
            print(f"  Lesson {num:02d} saved ({len(lesson['definitions'])} defs): {fname}")

    print(f"\nCompleted! Total Lessons: {total_lessons_written}, Total Definitions: {total_defs_written}")

    # 4. Copy to student_app assets
    app_asset_path = r"d:\profile\student_app\assets\data\all_languages_definitions.json"
    with open(app_asset_path, "w", encoding="utf-8") as f:
        json.dump(RAW_DATA, f, ensure_ascii=False, indent=2)
    print(f"Synced to student_app assets: {app_asset_path}")

if __name__ == "__main__":
    main()
