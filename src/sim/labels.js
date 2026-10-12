export const STAT_LABELS = { joy: '행복', vitality: '건강', courage: '용기', wisdom: '지혜', bond: '유대' };
export const EFFECT_LABELS = { ...STAT_LABELS, money: '소지금', reputation: '명성', infamy: '악명', debt: '빚' };
export const GENDERS = { male: '남성', female: '여성', unspecified: '미지정' };
/** Who the life dates: the opposite gender (default), either, or the same gender. Chosen at birth, kept in `s.romance`. */
export const ROMANCE = { opposite: '이성', any: '상관없음', same: '동성' };
