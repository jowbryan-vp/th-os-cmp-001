import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Button, Field, Input, ProgressBar, Select, Textarea } from "../../src/design-system";
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

describe("DS-001 Field label association", () => {
  it("associates the generated id between the label and the control, so clicking the label focuses it", () => {
    const html = renderToStaticMarkup(createElement(Field, { label: "Nome" } as ComponentProps<typeof Field>, createElement(Input, {})));
    const forId = html.match(/<label for="([^"]+)"/)?.[1];
    const inputId = html.match(/<input[^>]*\sid="([^"]+)"/)?.[1];
    assert.ok(forId, "o rótulo deve renderizar o atributo for");
    assert.equal(inputId, forId);
  });

  it("exposes an id-linked label reachable by getByLabelText for Input, Select and Textarea", () => {
    const cases: [string, ReturnType<typeof createElement>, RegExp][] = [
      ["Input", createElement(Input, {}), /<input[^>]*\sid="([^"]+)"/],
      ["Select", createElement(Select, {}, createElement("option", { value: "a" }, "A")), /<select[^>]*\sid="([^"]+)"/],
      ["Textarea", createElement(Textarea, {}), /<textarea[^>]*\sid="([^"]+)"/],
    ];
    for (const [name, control, controlPattern] of cases) {
      const html = renderToStaticMarkup(createElement(Field, { label: `Campo ${name}` } as ComponentProps<typeof Field>, control));
      const forId = html.match(/<label for="([^"]+)"/)?.[1];
      const controlId = html.match(controlPattern)?.[1];
      assert.ok(forId, `${name}: o rótulo deve ter for`);
      assert.equal(controlId, forId, `${name}: id do controle deve casar com o for do rótulo`);
      assert.match(html, new RegExp(`<label for="${forId}">Campo ${name}`));
    }
  });

  it("preserves an explicitly provided id instead of overwriting it with an auto-generated one", () => {
    const html = renderToStaticMarkup(createElement(Field, { label: "Nome", htmlFor: "custom-id" } as ComponentProps<typeof Field>, createElement(Input, { id: "custom-id" })));
    assert.match(html, /<label for="custom-id"/);
    assert.match(html, /<input[^>]*\sid="custom-id"/);
  });

  it("generates distinct ids for multiple Field instances so no duplicate id is produced", () => {
    const html = renderToStaticMarkup(createElement("div", null,
      createElement(Field, { label: "Campo A" } as ComponentProps<typeof Field>, createElement(Input, {})),
      createElement(Field, { label: "Campo B" } as ComponentProps<typeof Field>, createElement(Input, {})),
    ));
    const ids = [...html.matchAll(/<input[^>]*\sid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(ids.length, 2);
    assert.notEqual(ids[0], ids[1]);
  });
});
