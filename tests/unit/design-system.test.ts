import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Button, Field, Input, ProgressBar } from "../../src/design-system";
import { colors, spacing, breakpoints } from "../../src/design-system/tokens";

describe("DS-001 contracts", () => {
  it("preserves the official brand and ordered responsive scale", () => {
    assert.equal(colors.brand.primary, "#677048");
    assert.equal(spacing[1], 4);
    assert.ok(breakpoints.mobile < breakpoints.desktop);
  });

  it("renders loading and disabled actions with native and ARIA semantics", () => {
    const html = renderToStaticMarkup(createElement(Button, { loading: true } as ComponentProps<typeof Button>, "Salvar"));
    assert.match(html, /disabled=""/);
    assert.match(html, /aria-busy="true"/);
    assert.match(html, />Salvar</);
  });

  it("exposes field errors and measurable progress without color alone", () => {
    const field = renderToStaticMarkup(createElement(Field, { label: "Nome", errorText: "Obrigatório" } as ComponentProps<typeof Field>, createElement(Input, { invalid: true })));
    const progress = renderToStaticMarkup(createElement(ProgressBar, { label: "Progresso", value: 68 }));
    assert.match(field, /role="alert"/);
    assert.match(field, /aria-invalid="true"/);
    assert.match(progress, /role="progressbar"/);
    assert.match(progress, /aria-valuenow="68"/);
  });
});
