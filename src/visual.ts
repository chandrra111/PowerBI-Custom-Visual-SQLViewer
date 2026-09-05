"use strict";

import powerbi from "powerbi-visuals-api";
import Prism from "prismjs";
import { format as formatSql } from "sql-formatter";

import "prismjs/components/prism-sql";

import "./../style/visual.less";

import VisualConstructorOptions =
    powerbi.extensibility.visual.VisualConstructorOptions;

import VisualUpdateOptions =
    powerbi.extensibility.visual.VisualUpdateOptions;

import IVisual =
    powerbi.extensibility.visual.IVisual;

const COPY_LABEL = "📋 Copy SQL";
const COPY_RESET_MS = 2000;

/** Above this average line length, the text has lost its line structure. */
const MAX_COMFORTABLE_LINE_LENGTH = 120;

/**
 * Injected once in the constructor rather than on every update(), which fires
 * on each resize as well as on each data change.
 */
const STYLES = `
.sql-toolbar{
    margin-bottom:8px;
}

.sql-copy-btn{
    padding:4px 10px;
    cursor:pointer;
    border:1px solid #cccccc;
    border-radius:4px;
    background:#f5f5f5;
    font-family:Segoe UI, sans-serif;
    font-size:12px;
}

.sql-copy-btn:hover{
    background:#e8e8e8;
}

.sql-wrapper{
    display:flex;
    align-items:flex-start;
    white-space:pre;
}

/* Code must be monospace or the gutter drifts out of line with the source. */
.line-numbers,
.sql-code{
    margin:0;
    font-family:Consolas, "Cascadia Mono", "Courier New", monospace;
    font-size:13px;
    line-height:20px;
    white-space:pre;
}

.line-numbers{
    width:48px;
    text-align:right;
    padding-right:10px;
    margin-right:10px;
    border-right:1px solid #ddd;
    color:#888;
    background:#fafafa;
    user-select:none;
}

.sql-code{
    flex:1;
    overflow:auto;
    -webkit-font-smoothing:antialiased;
    -moz-osx-font-smoothing:grayscale;
}

/* Prism colors */

.token.keyword{
    color:#0000FF;
    font-weight:bold;
}

.token.operator{
    color:#AF00DB;
}

.token.comment{
    color:#008000;
    font-style:italic;
}

.token.string{
    color:#A31515;
}

.token.number{
    color:#098658;
}

.token.function{
    color:#795E26;
    font-weight:bold;
}

.token.boolean{
    color:#0000FF;
}

.token.punctuation{
    color:#333333;
}
`;

export class Visual implements IVisual {

    private container: HTMLDivElement;

    /** The text currently on screen — this is what the copy button yields. */
    private renderedSql = "";

    constructor(options: VisualConstructorOptions) {

        const style = document.createElement("style");
        style.textContent = STYLES;
        options.element.appendChild(style);

        this.container = document.createElement("div");

        this.container.style.width = "100%";
        this.container.style.height = "100%";
        this.container.style.overflow = "auto";
        this.container.style.padding = "8px";
        this.container.style.backgroundColor = "#ffffff";

        options.element.appendChild(this.container);
    }

    public update(options: VisualUpdateOptions): void {

        const category =
            options.dataViews?.[0]
                ?.categorical
                ?.categories?.[0];

        if (
            !category ||
            !category.values ||
            category.values.length === 0
        ) {
            this.renderedSql = "";
            this.container.textContent = "No SQL Found";
            return;
        }

        const sourceSql =
            String(category.values[0] ?? "");

        const sql = Visual.beautify(sourceSql);

        // innerHTML resets scrollTop, so carry it across the re-render.
        const scrollTop = this.container.scrollTop;
        const scrollLeft = this.container.scrollLeft;

        this.renderedSql = sql;
        this.render(sql);

        this.container.scrollTop = scrollTop;
        this.container.scrollLeft = scrollLeft;
    }

    /**
     * sql-formatter is a query formatter, not a procedural one: it lays out a
     * SELECT well but breaks a CREATE PROCEDURE header across odd lines. So it
     * is applied only where it clearly helps — input that has lost its line
     * structure, which is the case this visual exists to fix. SQL that already
     * reads well is left exactly as the author wrote it.
     */
    private static needsBeautifying(sql: string): boolean {

        const lines =
            sql.split("\n")
                .filter(line => line.trim().length > 0);

        if (lines.length <= 2) {
            return true;
        }

        const averageLength =
            lines.reduce((total, line) => total + line.length, 0) /
            lines.length;

        return averageLength > MAX_COMFORTABLE_LINE_LENGTH;
    }

    /**
     * Re-indents the SQL when it needs it. Anything sql-formatter cannot parse
     * is passed through untouched rather than failing the render.
     */
    private static beautify(sql: string): string {

        if (!sql.trim() || !Visual.needsBeautifying(sql)) {
            return sql;
        }

        try {

            return formatSql(sql, {
                language: "tsql",
                tabWidth: 4,
                keywordCase: "upper",
                linesBetweenQueries: 2
            });

        } catch {

            return sql;
        }
    }

    /**
     * Prism escapes its own output, but the fallback path does not — an
     * unescaped value here would execute any markup present in the source.
     */
    private static escapeHtml(value: string): string {

        return value
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    private render(sql: string): void {

        let highlighted: string;

        try {

            highlighted =
                Prism.highlight(
                    sql,
                    Prism.languages.sql,
                    "sql"
                );

        } catch {

            highlighted = Visual.escapeHtml(sql);
        }

        const lineCount = sql.split("\n").length;

        let lineNumbers = "";

        for (let i = 1; i <= lineCount; i++) {
            lineNumbers += i + "\n";
        }

        this.container.innerHTML = `
<div class="sql-toolbar">

    <button
        id="copySqlBtn"
        class="sql-copy-btn">

        ${COPY_LABEL}

    </button>

</div>

<div class="sql-wrapper">

    <pre class="line-numbers">${lineNumbers}</pre>

    <pre class="sql-code">${highlighted}</pre>

</div>
`;

        const button =
            this.container.querySelector(
                "#copySqlBtn"
            ) as HTMLButtonElement;

        if (button) {
            button.onclick = () => this.copyToClipboard(button);
        }
    }

    private copyToClipboard(button: HTMLButtonElement): void {

        const done = (label: string) => {

            button.innerText = label;

            setTimeout(() => {
                button.innerText = COPY_LABEL;
            }, COPY_RESET_MS);
        };

        // The async clipboard API is usually blocked inside the visual
        // sandbox, and can throw rather than reject when it is, so fall back
        // to the deprecated command in both cases.
        try {

            const write = navigator.clipboard?.writeText(this.renderedSql);

            if (write) {

                write.then(
                    () => done("✅ Copied"),
                    () => done(this.copyWithExecCommand())
                );

                return;
            }

        } catch {
            // fall through
        }

        done(this.copyWithExecCommand());
    }

    private copyWithExecCommand(): string {

        try {

            const textarea =
                document.createElement("textarea");

            textarea.value = this.renderedSql;
            textarea.style.position = "fixed";
            textarea.style.left = "-99999px";

            document.body.appendChild(textarea);

            textarea.focus();
            textarea.select();

            const ok = document.execCommand("copy");

            document.body.removeChild(textarea);

            return ok ? "✅ Copied" : "❌ Failed";

        } catch {

            return "❌ Failed";
        }
    }

    public destroy(): void {
    }
}
