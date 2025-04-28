// 利用言語コード
export const languages = ['ja','en','ko','zh','zht','th','vi','id','es']

// ブラウザ & localStorage から言語を判定
export function detectLang () {
  // 1) localStorage
  const saved = localStorage.getItem('lang')
  if (saved && languages.includes(saved)) return saved

  // 2) navigator.language
  const code = (navigator.language || 'en').toLowerCase()

  const map = {
    'ja-jp':'ja','ja':'ja',
    'ko-kr':'ko','ko':'ko',
    'zh-cn':'zh','zh-sg':'zh',
    'zh-tw':'zht','zh-hk':'zht','zh-mo':'zht',
    'th-th':'th','th':'th',
    'vi-vn':'vi','vi':'vi',
    'id-id':'id','id':'id',
    'es-mx':'es','es-419':'es','es':'es'
  }

  const lang = map[code] || code.slice(0,2)
  return languages.includes(lang) ? lang : 'en'
}
