const fs=require('node:fs');const p='data/questions.json',d=JSON.parse(fs.readFileSync(p));
function example(q,answer,stance,chains){q.answer=answer;q.logic={stance,chains};q.answerSource='AI 原创虚构示范，不使用原用户经历或答案';}
example(d.part1[0],`Yes, I tend to dislike adverts that interrupt a video several times, especially when the sound is much louder than the programme. For example, I recently stopped watching a cooking tutorial because the same advert kept appearing. I don't mind advertising in general, but I'd prefer a short advert at the beginning.`, '不喜欢反复打断视频且音量突出的广告', ['直接回答不喜欢的类型→反复中断、音量过大→描述一次看烹饪视频的例子','区分广告本身与投放方式→可接受片头短广告→保持回答具体']);
example(d.speaking[0],`I'd like to talk about a childhood friend called Leo. We met when we were about nine, at a Saturday drawing class in our neighbourhood. I had forgotten my pencil case on the first day, and he offered to share his pencils before I even asked. That small gesture made it much easier for me to settle in.

We went to different schools, so we mainly saw each other at weekends. After class, we would sit on a bench outside the community centre and invent short comic strips. I usually came up with the story, while he drew the characters. Our pictures weren't particularly impressive, but we could spend an entire afternoon arguing, quite happily, about what should happen next.

One afternoon, I accidentally spilled water over a comic we'd nearly finished. I expected him to be annoyed because we'd spent ages on it. Instead, he suggested making the water stain into a storm cloud and changing the ending. We actually liked the new version better than the original.

What I liked about Leo was that he made mistakes feel manageable. He was patient without being overly serious, and he never made me feel embarrassed about trying something new. We don't live near each other now, but we occasionally exchange drawings online. Whenever I start worrying too much about getting something perfect, I remember that ruined page and how calmly he dealt with it.`, '周末绘画班结识的 Leo：通过共同创作和处理失误体现耐心', ['人物与相识：九岁、周末绘画班、借铅笔→建立具体场景','共同活动：周末画漫画、分工编故事和画角色→交代相处方式','具体事件：洒水弄坏漫画→改成暴风雨场景→呈现解决问题的态度','喜欢的原因：不责备、让人敢尝试→联系现在的影响']);
example(d.speaking[0].followups[1],`I think childhood friendships are important because they give children a relatively safe place to practise dealing with other people. Unlike a parent, a friend won't always give in, so children have to negotiate, share things and sometimes apologise. For example, deciding which game to play can teach them to consider another person's preferences. Friends can also make a new school feel less intimidating. Having said that, the quality of a friendship matters more than the number of friends. A child with one supportive friend may feel more secure than someone in a large group where they are constantly being excluded.`, '童年友谊提供练习社交和获得支持的机会，质量比数量重要', ['朋友不会总迁就→需要协商分享和道歉→学习考虑他人','熟悉同伴提供支持→降低新学校的不安→建立归属感','限定：关系质量比数量重要→避免把受欢迎等同于健康友谊']);
// Other speaking questions receive planning prompts, not invented personal answers.
for(const q of [...d.part1,...d.speaking,...d.speaking.flatMap(x=>x.followups)]){
 if(q.logic)continue;
 q.logic={stance:'作答结构（非本题示范答案）',chains:q.part===1?['直接回答当前问题→给一个具体理由→补充生活细节或例子']:q.part===2?q.cues.map(c=>`回应提示点：${c}`):/why|reason/i.test(q.question)?['明确原因→解释原因如何产生影响→给群体或社会层面的例子→补充适用条件']:/difference|compare|better/i.test(q.question)?['选定比较标准→分别解释两方表现及原因→给出有条件的判断']:['直接给出观点→解释机制→举具体例子→说明例外或条件']};
}
// Remove repeated questions within a part without discarding related Part 2 associations.
const norm=s=>s.toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').trim();
const seen=new Set();d.part1=d.part1.filter(q=>{const k=norm(q.question);if(seen.has(k))return false;seen.add(k);return true});
d.meta={source:'仅从原 EnglishDesk 提取题目字段；不包含原答案、表达卡、录音或练习记录。题目来自原有备考资料，未认证为官方或当季题库。',generated:'写作逐题逻辑链与三个口语示范为 AI 原创，示范人物经历均属虚构。',formatSource:'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-speaking'};
fs.writeFileSync(p,JSON.stringify(d,null,2));
fs.writeFileSync('data/bank.js','window.BANK='+JSON.stringify(d)+';\n');
console.log({writing:d.writing.length,part1:d.part1.length,part2:d.speaking.length,part3:d.speaking.flatMap(q=>q.followups).length});
