import { Empty, Table } from 'antd';
import type { ReactNode } from 'react';
import type { TableProps } from 'antd';

interface LooseColumn {
  title?: unknown;
  dataIndex?: string;
  key?: string;
  render?: unknown;
}

interface ResponsiveTableProps<RecordType extends object> {
  dataSource: RecordType[];
  columns: object[];
  rowKey: keyof RecordType | ((record: RecordType) => string);
  emptyText?: ReactNode;
  size?: 'small' | 'middle' | 'large';
  minWidth?: number;
}

function valueFor<RecordType extends object>(
  column: LooseColumn,
  record: RecordType,
  index: number,
) {
  const value = column.dataIndex
    ? (record as unknown as Record<string, unknown>)[column.dataIndex]
    : undefined;
  return typeof column.render === 'function'
    ? Reflect.apply(column.render, undefined, [value, record, index]) as ReactNode
    : String(value ?? '-');
}

export default function ResponsiveTable<RecordType extends object>({
  dataSource,
  columns,
  rowKey,
  emptyText = '暂无记录',
  size = 'middle',
  minWidth = 720,
}: ResponsiveTableProps<RecordType>) {
  const normalizedColumns = columns.map((column) => column as LooseColumn);
  const keyFor = (record: RecordType) => (
    typeof rowKey === 'function' ? rowKey(record) : String(record[rowKey])
  );

  return (
    <>
      <div className="desktop-record-table">
        <Table
          dataSource={dataSource}
          columns={columns as TableProps<RecordType>['columns']}
          rowKey={keyFor}
          pagination={false}
          size={size}
          locale={{ emptyText }}
          scroll={{ x: minWidth }}
        />
      </div>

      <div className="mobile-record-list">
        {dataSource.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
        ) : dataSource.map((record, index) => {
          const actionColumn = normalizedColumns.find((column) => column.key === 'action');
          const detailColumns = normalizedColumns.filter((column) => column.key !== 'action');
          return (
            <article className="mobile-record-card" key={keyFor(record)}>
              {detailColumns.map((column, columnIndex) => (
                <div
                  className={columnIndex === 0 ? 'mobile-record-primary' : 'mobile-record-field'}
                  key={column.key ?? String(column.dataIndex)}
                >
                  <span className="mobile-record-label">{column.title as ReactNode}</span>
                  <span className="mobile-record-value">{valueFor(column, record, index)}</span>
                </div>
              ))}
              {actionColumn && (
                <div className="mobile-record-actions">
                  {valueFor(actionColumn, record, index)}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
