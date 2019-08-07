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
      fuzziness: 2
    }
  ],
  stopWords: [

  ]
};
