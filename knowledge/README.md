# Knowledge base

Every `.md` file in this folder (except this README) is loaded at startup, split into sections at each `## ` heading, and searched by the `search_apu_knowledge` tool.

**All files here are sample content for the demo. Replace them with APU's official, approved documents before any real use.**

## File format

```markdown
---
title: Fees and payment
audience: public, student
owner: Finance Office
---

## First section heading
Text...
```

- `audience` controls which personas can retrieve the document (role-based access):
  - `public`: everyone, including prospective students
  - `student`: current students, lecturers, admin staff
  - `staff`: admin staff, lecturers, researchers
  - `academic`: lecturers, researchers
  - `research`: researchers
- `owner` is the office responsible for keeping the content current.
