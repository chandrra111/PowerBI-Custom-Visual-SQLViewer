"use strict";

import powerbi from "powerbi-visuals-api";
import Prism from "prismjs";

import "prismjs/components/prism-sql";

import "./../style/visual.less";

import VisualConstructorOptions =
    powerbi.extensibility.visual.VisualConstructorOptions;

import VisualUpdateOptions =
    powerbi.extensibility.visual.VisualUpdateOptions;

import IVisual =
    powerbi.extensibility.visual.IVisual;

export class Visual implements IVisual {

    private container: HTMLDivElement;

    constructor(options: VisualConstructorOptions) {

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
            this.container.innerHTML = "No SQL Found";
            return;
        }

        const sqlText =
            String(category.values[0] ?? "");

        let highlighted: string;

        try {

            highlighted =
                Prism.highlight(
                    sqlText,
                    Prism.languages.sql,
                    "sql"
                );

        } catch {

            highlighted = sqlText;
        }

        const lineCount =
            sqlText.split("\n").length;

       
let lineNumbers = "";

for (let i = 1; i <= lineCount; i++) {
    lineNumbers += i + "\n";
}


        const html = `
<style>

.sql-toolbar{
    margin-bottom:8px;
}

.sql-copy-btn{
    padding:4px 10px;
    cursor:pointer;
    border:1px solid #cccccc;
    border-radius:4px;
    background:#f5f5f5;
    font-size:12px;
}

.sql-copy-btn:hover{
    background:#e8e8e8;
}





.code-area{
    flex:1;
    overflow:auto;
    user-select:text;
}

.sql-wrapper{
    display:flex;
    align-items:flex-start;
    font-family:Arial, sans-serif;
    font-size:14px;
    line-height:20px;
     white-space:pre;
}

.line-numbers{
    margin:0;
    width:60px;
    text-align:right;
    padding-right:10px;
    border-right:1px solid #ddd;
    margin-right:10px;
    color:#888;
    user-select:none;
    background:#fafafa;
    white-space:pre;
 font-family:Arial, sans-serif;
    font-size:14px;
    line-height:20px;

}

.sql-code{
    margin:0;
    flex:1;
    overflow:auto;
    white-space:pre;
   
line-height:20px;

    font-family:Arial, sans-serif;
    font-size:14px;

    -webkit-font-smoothing:antialiased;
    -moz-osx-font-smoothing:grayscale;
    text-rendering:optimizeLegibility;

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

</style>

<div class="sql-toolbar">

    <button
        id="copySqlBtn"
        class="sql-copy-btn">

        📋 Copy SQL

    </button>

</div>

<div class="sql-wrapper">

    <pre class="line-numbers">${lineNumbers}</pre>

    <pre class="sql-code">${highlighted}</pre>

</div>
`;

        this.container.innerHTML = html;

        const button =
            this.container.querySelector(
                "#copySqlBtn"
            ) as HTMLButtonElement;

        if (button) {

            button.onclick = () => {

                try {

                    const textarea =
                        document.createElement(
                            "textarea"
                        );

                    textarea.value =
                        sqlText;

                    textarea.style.position =
                        "fixed";

                    textarea.style.left =
                        "-99999px";

                    document.body.appendChild(
                        textarea
                    );

                    textarea.focus();
                    textarea.select();

                    document.execCommand(
                        "copy"
                    );

                    document.body.removeChild(
                        textarea
                    );

                    button.innerText =
                        "✅ Copied";

                }
                catch {

                    button.innerText =
                        "❌ Failed";

                }

                setTimeout(() => {

                    button.innerText =
                        "📋 Copy SQL";

                }, 2000);

            };
        }
    }

    public destroy(): void {
    }
}