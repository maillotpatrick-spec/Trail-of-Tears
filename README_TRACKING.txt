TRAIL OF TEARS v0.6.32 — CENTRAL TEACHER TRACKING

WHAT IS INCLUDED
- index.html: student site with non-blocking central tracking
- teacher.html: teacher dashboard
- api/track.js: records registrations, mission starts and genuine attempts
- api/teacher-results.js: protected dashboard data
- api/export-results.js: protected Excel export (.xlsx)
- package.json: Vercel dependencies

TRACKING RULES
- Opening a mission = STARTED, not an attempt.
- An attempt is counted only when a learner genuinely checks/submits a result.
- First try is immutable in the central aggregation.
- Best score can improve on later attempts.
- Registration lets the dashboard identify connected learners who never start a mission.
- M1/M2 record completion when their exploration requirements reach 100%.
- M3 records an attempt after all 3 questions are answered.
- M4 records each finished 13-question quiz.
- M5 records a successful AI writing review as an attempt.
- M6 counts each Check Part action as a try; the overall first-try score appears once both parts have a first score.
- M7 records each Check my writing action.

ONE-TIME VERCEL SETUP REQUIRED
1. In the existing Vercel project, create/connect a PRIVATE Vercel Blob store. Vercel will add BLOB_READ_WRITE_TOKEN to the project.
2. In Project Settings > Environment Variables, add:
   TEACHER_DASHBOARD_CODE = choose a private code known only to the teacher
   Enable it for Production (and Preview if desired).
3. Replace the GitHub repository contents with the files/folders from this package and commit to main.
4. Wait for Vercel Production deployment to be Ready.
5. Open: https://YOUR-DOMAIN.vercel.app/teacher.html

PRIVACY
The tracker stores only the learner-provided name/alias, class/group, mission activity, scores, attempts and timestamps. It does not store the text of students' written answers.

IMPORTANT
Without the Blob store, the learner site still works; only central tracking/export will be unavailable.
