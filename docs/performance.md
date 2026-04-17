# Performance Audit — Server-Action N+1 Analysis

> Date: 2026-04-16 | Enterprise preset

## Audited Actions

### 1. Feed — `src/app/(main)/feed/page.tsx`

**Pattern:** Single `db.post.findMany` with `include` for author, category, `_count`, and conditional likes.

**N+1:** NO. Well-structured single query with pagination.

**Overfetching:** NO. The `include` pulls only used fields. The conditional `likes` with `take: 1` is efficient for "is liked" checks.

**Indices:** `Post.createdAt` (sort), `Post.categoryId` (filter), `Like.userId + Like.postId` (unique) — all indexed.

### 2. Leaderboard — `src/lib/leaderboard-actions.ts`

**Pattern:** All functions use raw SQL (`$queryRaw`) with `RANK() OVER`, `JOIN`, and `GROUP BY`.

**N+1:** NO. Single query per function. Raw SQL is appropriate for window functions.

**Overfetching:** NO. Selects only needed columns.

**Indices:** `PointsEvent.userId + PointsEvent.createdAt` composite index present.

### 3. Classroom — `src/lib/enrollment-actions.ts`

**`getPublishedCourses`:**
- **N+1:** NO.
- **Overfetching:** YES (fixed). Previously fetched all module columns just to count `lessons.length`. Now uses `select` to fetch only `modules.lessons.id`.

**`getEnrolledCoursesWithProgress`:**
- **N+1:** NO. Two sequential queries (enrollments + lessonProgress), not N+1.
- **Overfetching:** YES (fixed). Previously included full `course` and `modules` rows. Now uses `select` to fetch only `id`, `title`, `description`, `coverImage`, `status` from course and `id` from modules/lessons.

### 4. Course listing — `src/lib/course-actions.ts`

**`getCourses`:**
- **N+1:** NO.
- **Overfetching:** MINOR. Fetches all course columns without `select`. Low priority — admin-only path with small dataset.

## Fixes Applied

| File | Function | Issue | Fix |
|------|----------|-------|-----|
| `enrollment-actions.ts` | `getPublishedCourses` | All module columns fetched | Added `select` — only `modules.lessons.id` |
| `enrollment-actions.ts` | `getEnrolledCoursesWithProgress` | All course/module columns fetched | Added `select` — only 5 course fields + `modules.id` + `lessons.id` |

## Missing Indices

None detected. Index coverage is comprehensive across all audited queries.

## Summary

No N+1 patterns found in any of the top-3 hot paths. The main issues were overfetching in `enrollment-actions.ts` where nested `include` pulled full rows when only IDs or counts were needed. Both fixed with `select` clauses.
