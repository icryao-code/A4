import type { Idiom, Question } from "./types";

const dictionarySource = "《现代汉语词典》（第7版）常用词条，发布前人工校审";
const questionSource = "原创训练题；依据词典释义编写语境，非官方真题";

export const CURATED_IDIOMS: Idiom[] = [
  ["追本溯源", "zhuī běn sù yuán", "追究事物产生的根源。", "面对问题要追本溯源，才能找到长效解决办法。", "思维方法"],
  ["因地制宜", "yīn dì zhì yí", "根据不同地区的具体情况制定适宜的办法。", "各地应当因地制宜发展特色产业。", "治理与发展"],
  ["精益求精", "jīng yì qiú jīng", "已经很好了还要求更加完美。", "公共服务要在细节上精益求精。", "表达积累"],
  ["未雨绸缪", "wèi yǔ chóu móu", "趁着天没下雨，先修缮房屋门窗；比喻事先做好准备。", "做好风险预案是未雨绸缪。", "治理与发展"],
  ["见微知著", "jiàn wēi zhī zhù", "见到一点苗头就能知道其发展的趋向。", "从消费变化可以见微知著。", "思维方法"],
  ["落地生根", "luò dì shēng gēn", "比喻事物在某地生根发展或取得稳固地位。", "好政策要落地生根才有真实效果。", "治理与发展"],
  ["集思广益", "jí sī guǎng yì", "集中群众的智慧，广泛吸收有益的意见。", "民主决策需要集思广益。", "治理与发展"],
  ["水到渠成", "shuǐ dào qú chéng", "比喻条件成熟，事情自然成功。", "基础打牢后，转型升级便会水到渠成。", "表达积累"],
  ["居安思危", "jū ān sī wēi", "处在安定环境中也要想到可能出现的危险。", "越是发展顺利，越要居安思危。", "思维方法"],
  ["有条不紊", "yǒu tiáo bù wěn", "形容做事、说话有条理，丝毫不乱。", "工作人员有条不紊地疏导人群。", "表达积累"],
  ["推陈出新", "tuī chén chū xīn", "去掉旧的，创造出新的。", "文化传承需要推陈出新。", "思维方法"],
  ["革故鼎新", "gé gù dǐng xīn", "破除旧的，建立新的。", "制度建设要坚持革故鼎新。", "思维方法"],
  ["披荆斩棘", "pī jīng zhǎn jí", "比喻在前进道路上清除障碍，克服困难。", "改革发展需要披荆斩棘的勇气。", "表达积累"],
  ["防微杜渐", "fáng wēi dù jiàn", "在错误或坏事刚露头时就及时制止。", "基层监督要做到防微杜渐。", "治理与发展"],
  ["高屋建瓴", "gāo wū jiàn líng", "形容居高临下的形势或不可阻挡的气势。", "这项规划体现了高屋建瓴的战略眼光。", "表达积累"],
  ["相得益彰", "xiāng dé yì zhāng", "两者互相配合，使双方的作用和优点更加明显。", "科技与教育相得益彰。", "表达积累"],
  ["顺理成章", "shùn lǐ chéng zhāng", "指事情合乎情理，自然产生结果。", "建立评价机制是顺理成章的选择。", "表达积累"],
  ["锲而不舍", "qiè ér bù shě", "不断地镂刻，比喻有恒心，有毅力。", "解决难题需要锲而不舍。", "思维方法"],
  ["按部就班", "àn bù jiù bān", "按照一定的条理，遵循一定的程序。", "项目建设应当按部就班推进。", "治理与发展"],
  ["择善而从", "zé shàn ér cóng", "采纳正确的意见或选择好的方法加以实行。", "面对不同建议要择善而从。", "思维方法"],
].map(([name, pinyin, meaning, example, category], index) => ({
  id: `idiom-${String(index + 1).padStart(3, "0")}`,
  name,
  pinyin,
  meaning,
  example,
  category,
  sourceRef: dictionarySource,
  reviewStatus: "待校审",
  status: "published",
}));

const questionSeeds: Array<Omit<Question, "id">> = [
  { stem: "面对复杂问题，不能只看表面现象，更要______，才能找到真正的解决路径。", options: ["追本溯源", "走马观花", "人云亦云", "浅尝辄止"], answer: 0, explanation: "追本溯源指追究事物产生的根源，符合从表象深入根本的语境。", source: "原创训练题", sourceRef: questionSource, difficulty: "基础", status: "published", contentStatus: "curated" },
  { stem: "面对新情况，工作方法也要______，不能固守过去的经验。", options: ["因地制宜", "墨守成规", "按图索骥", "削足适履"], answer: 0, explanation: "因地制宜强调根据具体情况采取适宜办法，和调整工作方法相呼应。", source: "原创训练题", sourceRef: questionSource, difficulty: "基础", status: "published", contentStatus: "curated" },
  { stem: "有些政策看似声势浩大，但如果缺少长期执行，最终容易______。", options: ["功亏一篑", "水到渠成", "顺理成章", "相得益彰"], answer: 0, explanation: "功亏一篑比喻事情只差最后一点没有完成，符合执行中断的语境。", source: "原创训练题", sourceRef: questionSource, difficulty: "进阶", status: "published", contentStatus: "curated" },
  { stem: "基层治理不能______，必须真正了解群众的需求和困难。", options: ["闭门造车", "集思广益", "未雨绸缪", "择善而从"], answer: 0, explanation: "闭门造车比喻脱离实际，和了解群众需求形成对照。", source: "原创训练题", sourceRef: questionSource, difficulty: "基础", status: "published", contentStatus: "curated" },
  { stem: "面对成绩，团队没有沾沾自喜，而是继续______，查找新的增长空间。", options: ["精益求精", "故步自封", "讳疾忌医", "急功近利"], answer: 0, explanation: "精益求精表示已经很好仍要求更加完美，符合持续改进。", source: "原创训练题", sourceRef: questionSource, difficulty: "基础", status: "published", contentStatus: "curated" },
  { stem: "改革不能______，要充分评估不同地区的实际承受能力。", options: ["一刀切", "顺水推舟", "高屋建瓴", "见微知著"], answer: 0, explanation: "一刀切比喻用同一种方式处理不同问题，忽视实际差异。", source: "原创训练题", sourceRef: questionSource, difficulty: "基础", status: "published", contentStatus: "curated" },
  { stem: "只有把制度优势转化为治理效能，才能真正做到______。", options: ["落地生根", "隔岸观火", "南辕北辙", "缘木求鱼"], answer: 0, explanation: "落地生根比喻事物在某地生根发展，强调制度要求得到落实。", source: "原创训练题", sourceRef: questionSource, difficulty: "进阶", status: "published", contentStatus: "curated" },
  { stem: "阅读材料时，既要把握整体结构，也要______，关注关键细节。", options: ["见微知著", "好高骛远", "不求甚解", "顾此失彼"], answer: 0, explanation: "见微知著强调从细节迹象判断发展趋势，符合材料阅读要求。", source: "原创训练题", sourceRef: questionSource, difficulty: "基础", status: "published", contentStatus: "curated" },
  { stem: "公共服务的优化需要持续反馈，不能因为一次调整有效就______。", options: ["高枕无忧", "未雨绸缪", "防微杜渐", "居安思危"], answer: 0, explanation: "高枕无忧比喻没有忧虑，和持续反馈、持续改进的要求相反。", source: "原创训练题", sourceRef: questionSource, difficulty: "基础", status: "published", contentStatus: "curated" },
  { stem: "面对舆论热点，媒体应当核实事实，避免______地跟随情绪。", options: ["盲目跟风", "按部就班", "锲而不舍", "有条不紊"], answer: 0, explanation: "盲目跟风表示没有判断地跟随他人或潮流，和核实事实相反。", source: "原创训练题", sourceRef: questionSource, difficulty: "基础", status: "published", contentStatus: "curated" },
  { stem: "解决发展中的问题，要敢于正视矛盾，不能______。", options: ["讳疾忌医", "披荆斩棘", "推陈出新", "革故鼎新"], answer: 0, explanation: "讳疾忌医比喻掩饰缺点错误、不愿改正，符合语境。", source: "原创训练题", sourceRef: questionSource, difficulty: "基础", status: "published", contentStatus: "curated" },
  { stem: "公共决策既要听取多方意见，也要在充分论证后______。", options: ["择善而从", "固步自封", "随波逐流", "隔岸观火"], answer: 0, explanation: "择善而从表示采纳正确意见并付诸实行，符合审慎决策。", source: "原创训练题", sourceRef: questionSource, difficulty: "进阶", status: "published", contentStatus: "curated" },
];

export const CURATED_QUESTIONS: Question[] = questionSeeds.map((question, index) => ({ ...question, id: `curated-${String(index + 1).padStart(3, "0")}`, reviewedAt: "待内容编辑复核" }));

export const CONTENT_NOTICE = "词条和题目为可追溯编辑内容，依据词典释义编写，不冒充官方真题；发布前仍需人工校审。";
