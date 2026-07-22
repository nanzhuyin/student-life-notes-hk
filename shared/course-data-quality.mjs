export const KNOWN_NON_COURSE_IDS = [
  'lingnan-tpg-faculty-of-business-master-of-science-in-ebusiness-and-supply-chain-management-ay-2023-1',
  'lingnan-tpg-faculty-of-business-master-of-science-in-ebusiness-and-supply-chain-management-ay-2024-2',
  'lingnan-tpg-faculty-of-business-master-of-science-in-ebusiness-and-supply-chain-management-ay-2025-3'
];

const knownNonCourseIds = new Set(KNOWN_NON_COURSE_IDS);

export function isKnownNonCourse(courseOrId) {
  const id = typeof courseOrId === 'string' ? courseOrId : courseOrId?.id;
  return Boolean(id && knownNonCourseIds.has(id));
}

export function filterKnownNonCourses(courses = []) {
  return courses.filter((course) => !isKnownNonCourse(course));
}
