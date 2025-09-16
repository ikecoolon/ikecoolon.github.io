module.exports = {
  extends: [
    'stylelint-config-standard',
    'stylelint-config-standard-vue'
  ],
  rules: {
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'screen',
          'layer',
          'apply',
          'variants',
          'responsive',
          'components',
          'utilities',
          'tailwind'
        ]
      }
    ],
    'function-no-unknown': [
      true,
      {
        ignoreFunctions: ['theme']
      }
    ],
    'selector-pseudo-class-no-unknown': [
      true,
      {
        ignorePseudoClasses: ['global', 'deep']
      }
    ],
    'property-no-unknown': [
      true,
      {
        ignoreProperties: ['composes']
      }
    ],
    'no-descending-specificity': null,
    'selector-class-pattern': null
  }
}
