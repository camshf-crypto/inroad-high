// 카카오 도서 검색 API 클라이언트

const KAKAO_API_KEY = import.meta.env.VITE_KAKAO_REST_API_KEY
const KAKAO_BOOK_SEARCH_URL = 'https://dapi.kakao.com/v3/search/book'

export interface KakaoBook {
  title: string
  authors: string[]
  publisher: string
  contents: string
  thumbnail: string
  url: string
  isbn: string
  datetime: string
  price: number
  sale_price: number
  status: string
  translators: string[]
}

export interface KakaoBookSearchResponse {
  meta: {
    total_count: number
    pageable_count: number
    is_end: boolean
  }
  documents: KakaoBook[]
}

export interface BookSearchResult {
  title: string
  author: string          // 저자들 ','로 join
  publisher: string
  description: string     // contents
  thumbnail: string
  url: string             // 다음 책 상세 URL
  isbn: string
  datetime: string        // 출간일
  status: string          // 판매 상태
  translators: string[]   // 번역자들
}

export interface BookSearchPagedResult {
  results: BookSearchResult[]
  totalCount: number
  pageableCount: number
  isEnd: boolean
}

/**
 * 카카오 도서 검색 (페이지네이션)
 */
export async function searchBooksPaged(
  query: string,
  page = 1,
  size = 10,
): Promise<BookSearchPagedResult> {
  if (!query.trim()) {
    return { results: [], totalCount: 0, pageableCount: 0, isEnd: true }
  }

  if (!KAKAO_API_KEY) {
    console.error('VITE_KAKAO_REST_API_KEY가 .env에 설정되지 않았어요')
    throw new Error('도서 검색 API 키가 설정되지 않았어요')
  }

  const params = new URLSearchParams({
    query,
    page: String(page),
    size: String(size),
  })

  const res = await fetch(`${KAKAO_BOOK_SEARCH_URL}?${params}`, {
    headers: {
      Authorization: `KakaoAK ${KAKAO_API_KEY}`,
    },
  })

  if (!res.ok) {
    throw new Error(`카카오 도서 검색 실패: ${res.status}`)
  }

  const data: KakaoBookSearchResponse = await res.json()

  return {
    results: data.documents.map(b => ({
      title: b.title,
      author: (b.authors ?? []).join(', ') || '저자 미상',
      publisher: b.publisher || '',
      description: b.contents || '',
      thumbnail: b.thumbnail || '',
      url: b.url || '',
      isbn: b.isbn || '',
      datetime: b.datetime || '',
      status: b.status || '',
      translators: b.translators ?? [],
    })),
    totalCount: data.meta.total_count,
    pageableCount: data.meta.pageable_count,
    isEnd: data.meta.is_end,
  }
}

// 호환성을 위한 기존 함수
export async function searchBooks(query: string, size = 10): Promise<BookSearchResult[]> {
  const { results } = await searchBooksPaged(query, 1, size)
  return results
}