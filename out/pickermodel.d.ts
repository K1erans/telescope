export interface PickerFile {
    readonly relativePath: string;
    readonly filename: string;
}
export type PickerRow = InfoRow | DirectoryRow | FileRow;
export interface InfoRow {
    readonly kind: 'info';
    readonly message: string;
}
export interface DirectoryRow {
    readonly kind: 'directory';
    readonly name: string;
    readonly scopePrefix: string;
    readonly drillPath: string;
}
export interface FileRow {
    readonly kind: 'file';
    readonly relativePath: string;
    readonly filename: string;
    readonly description: string;
}
export interface PickerModel {
    update(input: string, maxResults: number): readonly PickerRow[];
}
export declare function createPickerModel(files: readonly PickerFile[]): PickerModel;
//# sourceMappingURL=pickermodel.d.ts.map