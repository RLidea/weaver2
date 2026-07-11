import type { ReactNode } from 'react';

export interface DataTableColumn<T> {
  /** key for React key prop on header/cell */
  key: string;
  /** thead 셀 내용 */
  header: ReactNode;
  /** tbody 셀 렌더 함수 */
  cell: (row: T, index: number) => ReactNode;
  /** th/td에 추가될 className */
  className?: string;
  /** th에만 적용할 className (정렬·width 등) */
  headerClassName?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  /** 각 행의 React key */
  keyField: keyof T | ((row: T) => string);
  /** 데이터 없을 때 메시지 (기본: '데이터가 없습니다.') */
  emptyMessage?: ReactNode;
  /** 표 외곽 className */
  className?: string;
  /** thead 행 className */
  headerRowClassName?: string;
  /** tbody 행 className 또는 콜백 */
  rowClassName?: string | ((row: T, index: number) => string);
  /** 행 클릭 핸들러 (있으면 cursor-pointer 적용) */
  onRowClick?: (row: T, index: number) => void;
}

/**
 * 어드민 화면에서 반복되는 테이블 패턴을 공통화한 컴포넌트.
 *
 * - 글래스모피즘 토큰(border-border / divide-border / hover:bg-surface-2)을
 *   내부에 캡슐화하여 호출자는 컬럼 정의만 신경 쓰면 된다.
 * - 행 클릭이 필요한 경우 `onRowClick`만 넘기면 cursor 스타일이 적용된다.
 */
export function DataTable<T>({
  columns,
  data,
  keyField,
  emptyMessage = '데이터가 없습니다.',
  className,
  headerRowClassName,
  rowClassName,
  onRowClick,
}: DataTableProps<T>) {
  const resolveKey = (row: T): string =>
    typeof keyField === 'function'
      ? (keyField as (row: T) => string)(row)
      : String(row[keyField as keyof T]);

  const resolveRowClass = (row: T, index: number): string => {
    const base =
      'transition-colors hover:bg-surface-2' +
      (onRowClick ? ' cursor-pointer' : '');
    if (typeof rowClassName === 'function') {
      return `${base} ${rowClassName(row, index)}`;
    }
    return rowClassName ? `${base} ${rowClassName}` : base;
  };

  return (
    <div
      className={
        'overflow-x-auto rounded-lg border border-border bg-surface' +
        (className ? ` ${className}` : '')
      }
    >
      <table className="w-full text-sm">
        <thead>
          <tr
            className={
              'border-b border-border bg-surface-2 text-left text-xs font-semibold text-text-muted' +
              (headerRowClassName ? ` ${headerRowClassName}` : '')
            }
          >
            {columns.map((col) => (
              <th
                key={col.key}
                className={
                  'px-4 py-3' +
                  (col.headerClassName ? ` ${col.headerClassName}` : '') +
                  (col.className ? ` ${col.className}` : '')
                }
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-12 text-center text-text-muted"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={resolveKey(row)}
                className={resolveRowClass(row, index)}
                onClick={onRowClick ? () => onRowClick(row, index) : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={'px-4 py-3' + (col.className ? ` ${col.className}` : '')}
                  >
                    {col.cell(row, index)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
