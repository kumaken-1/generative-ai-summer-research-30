export const POWER_DEFINITIONS = [
  {
    id: "agency",
    name: "主体性の剣",
    description: "使う・使わないを自分で決める",
  },
  {
    id: "safety",
    name: "情報守りの盾",
    description: "入力してよい情報か確かめる",
  },
  {
    id: "delegation",
    name: "仕事選びの羅針盤",
    description: "AIに任せる仕事を見極める",
  },
  {
    id: "instruction",
    name: "指示の魔法袋",
    description: "目的・材料・相手・形式を伝える",
  },
  {
    id: "dialogue",
    name: "対話の杖",
    description: "追加の言葉で答えを近づける",
  },
  {
    id: "verification",
    name: "真実を映す鏡",
    description: "事実・日付・根拠を確かめる",
  },
  {
    id: "finishing",
    name: "仕上げのたい焼き",
    description: "自分の言葉と実態に合わせて仕上げる",
  },
];

const emptyPowerValues = (initialValue) =>
  Object.fromEntries(POWER_DEFINITIONS.map(({ id }) => [id, initialValue(id)]));

export const powerTotals = (quests) => {
  const totals = emptyPowerValues(() => 0);
  for (const quest of quests) {
    if (Object.hasOwn(totals, quest.primaryPower)) {
      totals[quest.primaryPower] += 1;
    }
    if (Object.hasOwn(totals, quest.supportingPower)) {
      totals[quest.supportingPower] += 1;
    }
  }
  return totals;
};

export const calculatePowerProgress = (quests, completedIds) => {
  const questsById = new Map(quests.map((quest) => [quest.id, quest]));
  const completedQuests = [...new Set(completedIds)]
    .map((id) => questsById.get(id))
    .filter(Boolean);
  const totals = powerTotals(quests);
  const earned = powerTotals(completedQuests);

  return {
    completedQuestCount: completedQuests.length,
    earnedTotal: completedQuests.length * 2,
    total: quests.length * 2,
    byPower: emptyPowerValues((id) => ({
      earned: earned[id],
      total: totals[id],
    })),
  };
};
