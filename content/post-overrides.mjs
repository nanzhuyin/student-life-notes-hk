const postTitleOverrides = {
  'shared-submission_housing_010': '聚康山庄 3 楼合租次卧 HKD 5000/月',
  'shared-submission_housing_046': '聚康山庄 10 楼两房次卧 HKD 5000/月',
  'shared-submission_housing_011': '聚康山庄 2 楼四房主卧 HKD 6500/月',
  'shared-submission_housing_026': '聚康山庄 10 楼三房主卧 HKD 6500/月',
  'shared-submission_housing_053': '聚康山庄 3 楼小客房 HKD 6500/月',
  'shared-submission_housing_012': '聚康山庄 8 楼四房次卧 HKD 4500/月',
  'shared-submission_housing_027': '聚康山庄 11 楼三房主卧 HKD 4500/月',
  'shared-submission_housing_020': '聚康山庄 12 楼两房 HKD 7000/月（安保体验）',
  'shared-submission_housing_021': '聚康山庄 12 楼两房 HKD 7000/月（前台体验）',
  'shared-submission_housing_040': '菁隽 8 楼单人间 HKD 8500/月',
  'shared-submission_housing_043': '菁隽 20 楼开放式单间 HKD 8500/月',
  'shared-submission_housing_047': '聚康山庄 22 楼三房次卧 HKD 6300/月',
  'shared-submission_housing_050': '聚康山庄 18 楼两房两厅 HKD 6300/月'
};

export function applyPostOverrides(post) {
  const title = postTitleOverrides[post.id];
  return title ? { ...post, title } : post;
}
