# Programme Recommender Backend

This document covers only the database, crawler import, and DeepSeek API proxy. The frontend must not call DeepSeek directly.

## Data Source

- Official entry page: https://www.ln.edu.hk/sgs/programmes-on-offer
- Crawler: `scripts/crawl-lingnan-programmes.mjs`
- Generated knowledge base:
  - `src/data/programmes.json`
  - `src/data/programmes.raw.json`

Current crawl result:

- Programmes: 50
- Programmes with course information: 45
- Programmes without course information: 5
- Programmes with official career or graduate outcome text: 30
- Programmes with selected year-labelled graduate examples: 1
- Programmes without usable graduate/career outcome text: 20

If a public official page does not provide course details, the programme is marked with `informationInsufficient = true` and an `informationLimits` entry. The crawler does not use logged-in pages and does not bypass access controls.

The knowledge base also stores graduate/career outcome fields extracted from public source text:

- `graduateOutcomeSummary`
- `graduateOutcomes`
- `graduateOutcomeInformationInsufficient`
- `graduateOutcomeInformationLimits`

Official programme pages often provide career prospects or selected graduate examples, but not a complete year-by-year graduate destination table for every cohort. When year-by-year destination data is not available, the programme is marked as graduate-outcome information insufficient. Public social sources such as programme/department WeChat articles or Xiaohongshu posts may be added only when they are openly accessible without login or access bypass; they must be labelled as `officialSocial` or `publicSocial` and must not be presented as official university outcomes unless the account/source is verifiably official.

## Supabase Tables

`supabase/schema.sql` adds:

- `public.programmes`
- `public.programme_sync_logs`
- `public.recommendation_logs`

The SQL is repeatable: it uses `create table if not exists`, `create index if not exists`, and `drop policy if exists`. It does not delete existing data and does not modify `otter_posts` data.

Run the SQL in the Supabase SQL editor, then import the bundled knowledge base:

```bash
SUPABASE_URL="https://YOUR_PROJECT.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY" \
npm run import:programmes
```

The service role key must only be used server-side.

## Backend Endpoint

`server/index.mjs` exposes:

```http
POST /api/recommend-programmes
Content-Type: application/json
```

Request:

```json
{
  "hasChosenProgramme": true,
  "selectedProgrammeId": "master-of-science-in-data-science",
  "selectedProgrammeName": "Master of Science in Data Science",
  "undergraduateMajor": "Statistics",
  "masterMajor": "Marketing",
  "mainCourses": ["Python", "Database"],
  "skills": ["SQL", "data analysis"],
  "interests": ["AI", "analytics"],
  "careerGoals": ["data analyst"],
  "preferredDirections": ["data science"],
  "targetDegreeLevels": ["Master"],
  "studyPreferences": ["full-time"],
  "concerns": ["not sure whether programming background is enough"],
  "workExperience": ["research assistant"],
  "otherContext": "I prefer roles connected with public policy and data."
}
```

Recommended frontend fields:

- `hasChosenProgramme`: whether the student has already picked a target programme.
- `selectedProgrammeId` or `selectedProgrammeName`: the chosen programme, if any.
- `undergraduateMajor`: the student's undergraduate major.
- `masterMajor`: the student's master's major. The current frontend requires this only when the selected or target degree level is `Doctor`.
- `mainCourses`: representative undergraduate courses.
- `skills`: academic or technical skills.
- `interests`: subject interests.
- `careerGoals`: target roles or industries.
- `preferredDirections`: broad academic directions.
- `targetDegreeLevels`: preferred degree levels, such as `Master` or `Doctor`.
- `studyPreferences`: full-time/part-time, research/taught, language, or other preferences.
- `concerns`: weak areas or decision concerns.
- `workExperience`: internships, research, or work background.
- `otherContext`: optional free-form context for special situations that do not fit the structured fields.

Success response:

```json
{
  "ok": true,
  "data": {
    "summary": "...",
    "recommendations": [],
    "notRecommended": [],
    "informationLimits": [],
    "disclaimer": "本推荐仅供参考，最终信息请以官方专业网站为准。"
  }
}
```

Error response:

```json
{
  "ok": false,
  "message": "string",
  "code": "VALIDATION_ERROR | AUTH_REQUIRED | NO_CANDIDATE_PROGRAMMES | MODEL_API_ERROR | MODEL_OUTPUT_INVALID | INTERNAL_ERROR"
}
```

## DeepSeek Configuration

Official DeepSeek docs state that the OpenAI-compatible base URL is `https://api.deepseek.com`, authentication uses bearer API keys, and JSON output is enabled by `response_format: { "type": "json_object" }` plus JSON instructions in the prompt:

- https://api-docs.deepseek.com/
- https://api-docs.deepseek.com/guides/json_mode
- https://api-docs.deepseek.com/api/deepseek-api

Server environment variables:

```bash
DEEPSEEK_API_KEY="..."
DEEPSEEK_BASE_URL="https://api.deepseek.com"
DEEPSEEK_MODEL="deepseek-v4-flash"
```

The API key must not be exposed in React code or GitHub Pages. If the DeepSeek call fails, the endpoint returns `MODEL_API_ERROR`; it does not fabricate a fallback recommendation.

## Recommendation Flow

1. Validate the student profile.
2. Load programmes from Supabase `programmes`.
3. If Supabase has not been populated, fall back to bundled `src/data/programmes.json` on the server.
4. Retrieve 3-5 candidates with weighted keyword matching.
   If the student has already selected a programme, keep that selected programme in the candidate set when it exists in the knowledge base, so DeepSeek can evaluate fit rather than ignore it.
5. Send only those candidate programme records to DeepSeek.
6. Request strict JSON output.
7. Validate that DeepSeek only recommends retrieved programme IDs.
8. Validate that every returned course name exists in the candidate programme data.
9. Validate that at least 3 recommendations are returned when at least 3 candidates were supplied.
10. Write `recommendation_logs`.
11. Return the structured response.

## Prompt Location

The system prompt is stored in `server/programme-recommender.mjs` as `DEEPSEEK_SYSTEM_PROMPT`. It requires DeepSeek to use only the supplied candidate knowledge base and to avoid inventing programme names, courses, admission requirements, fees, rankings, scholarships, or official claims.

DeepSeek must write all user-facing output in Simplified Chinese, including summaries, recommendation reasons, background-match explanations, course relevance explanations, preparation advice, potential gaps, career-fit text, information limits, and not-recommended reasons. Official programme names, official course names, IDs, URLs, and enum values must remain exactly as supplied by the knowledge base.

DeepSeek must describe future directions only from `graduateOutcomes`, `graduateOutcomeSummary`, and `careerDirections` in the candidate data. If the official pages do not include complete year-by-year graduate destinations, it must say that graduate outcome information is insufficient.

## Local Testing

Run the backend:

```bash
npm run dev:api
```

Call the endpoint:

```bash
curl http://127.0.0.1:8787/api/recommend-programmes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_OR_ADMIN_TOKEN" \
  -d '{
    "hasChosenProgramme": true,
    "selectedProgrammeName": "Master of Science in Data Science",
    "undergraduateMajor": "Statistics",
    "masterMajor": "Marketing",
    "mainCourses": ["Python", "Database"],
    "skills": ["SQL", "data analysis"],
    "interests": ["AI"],
    "careerGoals": ["data analyst"],
    "preferredDirections": ["data science"],
    "targetDegreeLevels": ["Master"],
    "studyPreferences": ["full-time"],
    "concerns": ["not sure whether programming background is enough"],
    "workExperience": ["research assistant"],
    "otherContext": "I prefer roles connected with public policy and data."
  }'
```

Without `DEEPSEEK_API_KEY`, the endpoint should return `MODEL_API_ERROR`.
