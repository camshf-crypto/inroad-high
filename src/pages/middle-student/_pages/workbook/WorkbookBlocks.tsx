// src/pages/middle-student/_pages/workbook/WorkbookBlocks.tsx
import type {
  Field,
  FieldId,
  WorkbookAnswers,
  WorkbookBlock,
  WorkbookPage,
} from './blocks';

type AnswerValue = string | number | boolean | string[];

interface Props {
  page: WorkbookPage;
  answers: WorkbookAnswers;
  onChange: (id: FieldId, value: AnswerValue) => void;
  readOnly?: boolean;
}

/* ================================================================== */
/* 입력 필드                                                          */
/* ================================================================== */

interface FieldProps {
  field: Field;
  answers: WorkbookAnswers;
  onChange: (id: FieldId, value: AnswerValue) => void;
  readOnly?: boolean;
  inline?: boolean;
}

function FieldInput({ field, answers, onChange, readOnly, inline }: FieldProps) {
  const raw = answers[field.id];

  if (field.kind === 'check') {
    return (
      <label className="wb-check">
        <input
          type="checkbox"
          checked={raw === true}
          disabled={readOnly}
          onChange={(e) => onChange(field.id, e.target.checked)}
        />
        <span>{field.label}</span>
      </label>
    );
  }

  if (field.kind === 'stars') {
    const max = field.max ?? 5;
    const score = typeof raw === 'number' ? raw : 0;
    return (
      <div className="wb-stars">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            className={n <= score ? 'wb-star on' : 'wb-star'}
            onClick={() => onChange(field.id, n === score ? 0 : n)}
            aria-label={`${n}점`}
          >
            ★
          </button>
        ))}
      </div>
    );
  }

  if (field.kind === 'textarea') {
    return (
      <textarea
        className="wb-textarea"
        rows={field.rows ?? 3}
        value={typeof raw === 'string' ? raw : ''}
        placeholder={field.placeholder}
        disabled={readOnly}
        onChange={(e) => onChange(field.id, e.target.value)}
      />
    );
  }

  const cls = [
    'wb-input',
    field.kind === 'number' ? 'num' : '',
    field.kind === 'hash' ? 'hash' : '',
    inline ? 'inline' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className="wb-input-wrap">
      {field.kind === 'hash' && <span className="wb-hash-mark">#</span>}
      <input
        className={cls}
        type={field.kind === 'number' ? 'number' : 'text'}
        inputMode={field.kind === 'number' ? 'decimal' : undefined}
        max={field.max}
        value={raw === undefined || raw === null ? '' : String(raw)}
        placeholder={field.placeholder}
        disabled={readOnly}
        onChange={(e) =>
          onChange(
            field.id,
            field.kind === 'number'
              ? e.target.value === ''
                ? ''
                : Number(e.target.value)
              : e.target.value,
          )
        }
      />
      {field.suffix && <span className="wb-suffix">{field.suffix}</span>}
    </span>
  );
}

/* ================================================================== */
/* 블록 12종                                                          */
/* ================================================================== */

function BlockView({
  block,
  answers,
  onChange,
  readOnly,
}: {
  block: WorkbookBlock;
  answers: WorkbookAnswers;
  onChange: (id: FieldId, value: AnswerValue) => void;
  readOnly?: boolean;
}) {
  const f = (field: Field, inline = false) => (
    <FieldInput
      key={field.id}
      field={field}
      answers={answers}
      onChange={onChange}
      readOnly={readOnly}
      inline={inline}
    />
  );

  switch (block.type) {
    /* 1. 표지 --------------------------------------------------- */
    case 'cover':
      return (
        <div className="wb-cover">
          <p className="wb-cover-badge">{block.badge}</p>
          <p className="wb-cover-week">
            {block.week}
            {block.subject && <span className="wb-cover-subject">{block.subject}</span>}
          </p>
          <h1 className="wb-cover-title">{block.title}</h1>

          {block.question && (
            <div className="wb-cover-question">
              <span className="wb-label-sm">오늘의 질문</span>
              <p>&ldquo;{block.question}&rdquo;</p>
            </div>
          )}

          <div className="wb-cover-quote">
            <span className="wb-label-sm">오늘의 한 줄</span>
            <p>&ldquo;{block.quote}&rdquo;</p>
          </div>

          <div className="wb-cover-output">
            <span className="wb-label-sm accent">FINAL OUTPUT</span>
            <strong>{block.outputTitle}</strong>
            {block.outputDesc && <p>{block.outputDesc}</p>}
          </div>

          {block.askName && (
            <div className="wb-cover-meta">
              {f({ id: 'p1-name', kind: 'text', label: '이름' })}
              {f({ id: 'p1-date', kind: 'text', label: '수업 날짜' })}
            </div>
          )}
        </div>
      );

    /* 2. 안내문 ------------------------------------------------- */
    case 'notice':
      return (
        <div className={`wb-notice ${block.variant}`}>
          {block.heading && <h4>{block.heading}</h4>}
          {block.lines.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      );

    /* 3. 진행표 ------------------------------------------------- */
    case 'agenda':
      return (
        <div className="wb-block">
          {block.heading && <h4 className="wb-h4">{block.heading}</h4>}
          <ol className="wb-agenda">
            {block.rows.map((row, i) => (
              <li key={i}>
                <span className="wb-agenda-no">{i + 1}</span>
                <span className="wb-agenda-label">{row.label}</span>
                <span className="wb-agenda-time">{row.time}</span>
              </li>
            ))}
          </ol>
        </div>
      );

    /* 4. 입력 나열 ---------------------------------------------- */
    case 'fields':
      return (
        <div className="wb-block">
          {block.heading && <h4 className="wb-h4">{block.heading}</h4>}
          {block.note && <p className="wb-note">{block.note}</p>}
          <div className={`wb-fields ${block.layout}`}>
            {block.fields.map((field, i) => (
              <div className="wb-field-row" key={field.id}>
                {block.layout === 'numbered' && <span className="wb-no">{i + 1}</span>}
                {field.label && block.layout !== 'numbered' && (
                  <span className="wb-field-label">{field.label}</span>
                )}
                {f(field, block.layout === 'inline' || block.layout === 'hash')}
              </div>
            ))}
          </div>
        </div>
      );

    /* 5. 표 입력 ------------------------------------------------ */
    case 'grid':
      return (
        <div className="wb-block">
          {block.heading && <h4 className="wb-h4">{block.heading}</h4>}
          {block.note && <p className="wb-note">{block.note}</p>}
          <div className="wb-table-scroll">
            <table className="wb-table">
              <thead>
                <tr>
                  {block.columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) =>
                      typeof cell === 'string' ? (
                        <td key={ci} className="wb-td-label">
                          {cell}
                        </td>
                      ) : (
                        <td key={cell.id}>{f(cell)}</td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {block.total && (
            <div className="wb-total">
              <span>합계</span>
              {f(block.total)}
            </div>
          )}
        </div>
      );

    /* 6. 채점 격자 ---------------------------------------------- */
    case 'score': {
      const sumOf = (ids: FieldId[]) =>
        ids.reduce((acc, id) => {
          const v = answers[id];
          return acc + (typeof v === 'number' ? v : 0);
        }, 0);

      return (
        <div className="wb-block">
          {block.heading && <h4 className="wb-h4">{block.heading}</h4>}
          <div className="wb-table-scroll">
            <table className="wb-table wb-score">
              <thead>
                <tr>
                  <th />
                  {block.criteria.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                  {block.showTotal !== false && <th className="wb-th-total">총점</th>}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row) => (
                  <tr key={row.label}>
                    <td className="wb-td-label">{row.label}</td>
                    {row.ids.map((id) => (
                      <td key={id}>
                        {f({ id, kind: 'number', max: block.max, placeholder: '0' })}
                      </td>
                    ))}
                    {block.showTotal !== false && (
                      <td className="wb-td-total">
                        {sumOf(row.ids)}
                        <em>/{block.max * block.criteria.length}</em>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    /* 7. 반복 카드 ---------------------------------------------- */
    case 'cards':
      return (
        <div className="wb-block">
          {block.heading && <h4 className="wb-h4">{block.heading}</h4>}
          <div className="wb-cards">
            {block.cards.map((card, ci) => (
              <div className="wb-card" key={ci}>
                <div className="wb-card-head">
                  <span className="wb-card-badge">
                    {block.cardLabel} {ci + 1}
                  </span>
                  {card.title && <strong>{card.title}</strong>}
                </div>
                <div className="wb-card-body">
                  {card.fields.map((field) => (
                    <div className="wb-field-row stack" key={field.id}>
                      {field.label && <span className="wb-field-label">{field.label}</span>}
                      {f(field)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    /* 8. 선택지 ------------------------------------------------- */
    case 'choice': {
      const selected = Array.isArray(answers[block.id])
        ? (answers[block.id] as string[])
        : typeof answers[block.id] === 'string' && answers[block.id]
          ? [answers[block.id] as string]
          : [];

      const toggle = (opt: string) => {
        if (readOnly) return;
        if (block.mode === 'single') {
          onChange(block.id, selected[0] === opt ? '' : opt);
          return;
        }
        onChange(
          block.id,
          selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt],
        );
      };

      return (
        <div className="wb-block">
          {block.heading && <h4 className="wb-h4">{block.heading}</h4>}
          {(block.note || block.pick) && (
            <p className="wb-note">{block.note ?? `${block.pick}개 고르세요`}</p>
          )}
          <div className={block.chip ? 'wb-chips' : 'wb-options'}>
            {block.options.map((opt) => (
              <button
                key={opt}
                type="button"
                disabled={readOnly}
                className={selected.includes(opt) ? 'wb-opt on' : 'wb-opt'}
                onClick={() => toggle(opt)}
              >
                {!block.chip && (
                  <span className="wb-opt-box">{selected.includes(opt) ? '✓' : ''}</span>
                )}
                {opt}
              </button>
            ))}
          </div>
          {block.other && (
            <div className="wb-field-row">
              <span className="wb-field-label">other</span>
              {f({ id: block.other, kind: 'text', placeholder: '직접 입력' })}
            </div>
          )}
        </div>
      );
    }

    /* 9. 빈칸 문장 ---------------------------------------------- */
    case 'sentence':
      return (
        <div className="wb-block">
          {block.heading && <h4 className="wb-h4">{block.heading}</h4>}
          {block.note && <p className="wb-note">{block.note}</p>}
          <div className="wb-sentences">
            {block.sentences.map((parts, si) => (
              <p className="wb-sentence" key={si}>
                {block.numbered && <span className="wb-no">{si + 1}</span>}
                {parts.map((part, pi) =>
                  typeof part === 'string' ? (
                    <span key={pi}>{part}</span>
                  ) : (
                    f(part, true)
                  ),
                )}
              </p>
            ))}
          </div>
        </div>
      );

    /* 10. FINAL OUTPUT 카드 ------------------------------------- */
    case 'output':
      return (
        <div className="wb-output">
          <div className="wb-output-head">
            <span className="wb-label-sm accent">FINAL OUTPUT</span>
            <h3>{block.title}</h3>
          </div>
          {block.groups.map((g, gi) => (
            <div className="wb-output-group" key={gi}>
              {g.heading && <h5>{g.heading}</h5>}
              {g.fields.map((field) => (
                <div className="wb-field-row stack" key={field.id}>
                  {field.label && <span className="wb-field-label">{field.label}</span>}
                  {f(field)}
                </div>
              ))}
            </div>
          ))}
        </div>
      );

    /* 11. SELF CHECK -------------------------------------------- */
    case 'selfcheck':
      return (
        <div className="wb-selfcheck">
          <h4 className="wb-h4">{block.heading ?? 'SELF CHECK'}</h4>
          <ul>
            {block.items.map((item) => (
              <li key={item.id}>{f({ id: item.id, kind: 'check', label: item.label })}</li>
            ))}
          </ul>
        </div>
      );

    /* 12. 다음 주 예고 ------------------------------------------ */
    case 'nextweek':
      return (
        <div className="wb-nextweek">
          <span className="wb-label-sm">{block.heading ?? '다음 주 예고'}</span>
          <strong>
            {block.subject && <em>{block.subject}</em>}
            {block.title}
          </strong>
          {block.quote && <p>&ldquo;{block.quote}&rdquo;</p>}
          {block.finalList && (
            <ul className="wb-final-list">
              {block.finalList.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}
        </div>
      );

    default:
      return null;
  }
}

/* ================================================================== */
/* 페이지                                                             */
/* ================================================================== */

export default function WorkbookBlocks({ page, answers, onChange, readOnly }: Props) {
  const isCover = page.blocks[0]?.type === 'cover';

  return (
    <div className={isCover ? 'wb-page cover' : 'wb-page'}>
      {!isCover && (
        <header className="wb-page-head">
          <span className="wb-page-no">PAGE {page.no}</span>
          <h2>{page.title}</h2>
        </header>
      )}
      {page.blocks.map((block, i) => (
        <BlockView
          key={i}
          block={block}
          answers={answers}
          onChange={onChange}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}