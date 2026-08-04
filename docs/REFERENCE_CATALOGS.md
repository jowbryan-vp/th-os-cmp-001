# Catálogos de referência

`CatalogOption` contém `id`, `catalogType`, `value`, `label`, `active`, `system`, `order`, `createdAt`, `updatedAt`, `parentId` e `projectId`. Opções globais têm `projectId = null`; pavimentos e ambientes podem ser específicos do projeto.

O `ReferenceCatalogRepository` oferece `list`, `listByType`, `create`, `update`, `deactivate`, `restore`, `resolve` e `search`. A comparação remove acentos, diferenças de caixa e espaços repetidos. Opções de sistema não são desativadas; opções criadas pelo usuário podem ser desativadas e restauradas.

O IndexedDB usa a store `reference-catalog-options`, criada na migração da versão 3 para a 4. Os presets incluem Rondônia, Cacoal, Vilhena e Ji-Paraná, além de pavimentos, setores, tipos e situações de imóvel, origens, funções, categorias documentais e tipos de visita.

O `CatalogCombobox` suporta busca, setas, Enter, Escape, criação inline, estado vazio e atributos ARIA de combobox/listbox. O backup consolidado v3 inclui `referenceCatalogOptions`; a restauração valida duplicatas e vínculos cidade–estado antes da transação atômica.
