require('dotenv').config();

module.exports = {
  terms: [
    {
      name: "title",
      boost: 2,
      fuzziness: 2
    },
    {
      name: "info",
      boost: 2,
      fuzziness: 2
    },
    {
      name: "text",
      boost: 2,
      fuzziness: 2
    },
    {
      name: "category",
      boost: 2,
      fuzziness: 2
    },
    {
      name: "createdAt",
      boost: 2,
    }
  ],
  stopWords: [
    'а', 'будем', 'будет', 'будете', 'будешь', 'буду', 'будут', 'будучи', 'будь', 'будьте', 'бы', 'был', 'была', 'были', 'было', 'быть', 'вами',
    'во', 'вот', 'все', 'всё', 'всего', 'всей', 'всем', 'всём', 'всеми', 'всему', 'всех', 'всею', 'всея', 'всю', 'вся', 'вы', 'да', 'в', 'вам',
    'для', 'до', 'его', 'едим', 'едят', 'ее', 'её', 'ей', 'ел', 'ела', 'ем', 'ему', 'емъ', 'если', 'ест', 'есть', 'ешь', 'еще', 'ещё', 'вас',
    'ею', 'же', 'за', 'и', 'из', 'или', 'им', 'ими', 'имъ', 'их', 'к', 'как', 'кем', 'ко', 'когда', 'кого', 'ком', 'кому', 'комья', 'которая',
    'которого', 'которое', 'которой', 'котором', 'которому', 'которою', 'которую', 'которые', 'который', 'которым', 'которыми', 'которых', 'весь',
    'кто', 'меня', 'мне', 'мной', 'мною', 'мог', 'моги', 'могите', 'могла', 'могли', 'могло', 'могу', 'могут', 'мое', 'моё', 'моего', 'моей',
    'моем', 'моём', 'моему', 'моею', 'можем', 'может', 'можете', 'можешь', 'мои', 'мой', 'моим', 'моими', 'моих', 'мочь', 'мою', 'моя', 'мы',
    'на', 'нам', 'нами', 'нас', 'наса', 'наш', 'наша', 'наше', 'нашего', 'нашей', 'нашем', 'нашему', 'нашею', 'наши', 'нашим', 'нашими', 'наших',
    'нашу', 'не', 'него', 'нее', 'неё', 'ней', 'нем', 'нём', 'нему', 'нет', 'нею', 'ним', 'ними', 'них', 'но', 'о', 'об', 'один', 'одна', 'одни',
    'одним', 'одними', 'одних', 'одно', 'одного', 'одной', 'одном', 'одному', 'одною', 'одну', 'он', 'она', 'оне', 'они', 'оно', 'от', 'по', 'при',
    'с', 'сам', 'сама', 'сами', 'самим', 'самими', 'самих', 'само', 'самого', 'самом', 'самому', 'саму', 'свое', 'своё', 'своего', 'своей', 'своем',
    'своём', 'своему', 'своею', 'свои', 'свой', 'своим', 'своими', 'своих', 'свою', 'своя', 'себе', 'себя', 'собой', 'собою', 'та',
    'так', 'такая', 'такие', 'таким', 'такими', 'таких', 'такого', 'такое', 'такой', 'таком', 'такому', 'такою', 'такую', 'те', 'тебе', 'тебя',
    'тем', 'теми', 'тех', 'то', 'тобой', 'тобою', 'того', 'той', 'только', 'том', 'томах', 'тому', 'тот', 'тою', 'ту', 'ты', 'у', 'уже', 'чего',
    'чем', 'чём', 'чему', 'что', 'чтобы', 'эта', 'эти', 'этим', 'этими', 'этих', 'это', 'этого', 'этой', 'этом', 'этому', 'этот', 'этою', 'эту', 'я'
  ]
};
