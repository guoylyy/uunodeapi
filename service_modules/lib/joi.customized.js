module.exports = {
  root: 'value',
  key: '"{{!key}}" ',
  messages: {
    wrapArrays: true
  },
  any: {
    unknown: '不能存在',
    invalid: 'contains an invalid value',
    empty: '不允许为空',
    required: '为必填字段',
    allowOnly: '只能为 {{valids}} 之一',
    default: 'threw an error when running default method'
  },
  alternatives: {
    base: 'not matching any of the allowed alternatives'
  },
  array: {
    base: '必须为数组',
    includes: 'at position {{pos}} does not match any of the allowed types',
    includesSingle: 'single value of "{{!key}}" does not match any of the allowed types',
    includesOne: 'at position {{pos}} fails because {{reason}}',
    includesOneSingle: 'single value of "{{!key}}" fails because {{reason}}',
    includesRequiredUnknowns: 'does not contain {{unknownMisses}} required value(s)',
    includesRequiredKnowns: 'does not contain {{knownMisses}}',
    includesRequiredBoth: 'does not contain {{knownMisses}} and {{unknownMisses}} other required value(s)',
    excludes: 'at position {{pos}} contains an excluded value',
    excludesSingle: 'single value of "{{!key}}" contains an excluded value',
    min: 'must contain at least {{limit}} items',
    max: 'must contain less than or equal to {{limit}} items',
    length: 'must contain {{limit}} items',
    ordered: 'at position {{pos}} fails because {{reason}}',
    orderedLength: 'at position {{pos}} fails because array must contain at most {{limit}} items',
    sparse: 'must not be a sparse array',
    unique: 'position {{pos}} contains a duplicate value'
  },
  boolean: {
    base: '必须为布尔值'
  },
  binary: {
    base: '必须为buffer或string',
    min: '至少 {{limit}} 字节',
    max: '至多 {{limit}} 字节',
    length: '需等于 {{limit}} 字节'
  },
  date: {
    base: '必须为毫秒数或合法的日期字符串',
    format: '需为满足 {{format}} 格式的日期类型',
    strict: '必须为合法的日期类型',
    min: '必须不大于 "{{limit}}"',
    max: '必须不小于 "{{limit}}"',
    isoDate: 'must be a valid ISO 8601 date',
    timestamp: {
      javascript: 'must be a valid timestamp or number of milliseconds',
      unix: 'must be a valid timestamp or number of seconds'
    },
    ref: 'references "{{ref}}" which is not a date'
  },
  function: {
    base: '必须为函数',
    arity: 'must have an arity of {{n}}',
    minArity: 'must have an arity greater or equal to {{n}}',
    maxArity: 'must have an arity lesser or equal to {{n}}',
    ref: 'must be a Joi reference'
  },
  lazy: {
    base: '!!schema error: lazy schema must be set',
    schema: '!!schema error: lazy schema function must return a schema'
  },
  object: {
    base: '必须为对象',
    child: '!!child "{{!child}}" fails because {{reason}}',
    min: 'must have at least {{limit}} children',
    max: 'must have less than or equal to {{limit}} children',
    length: 'must have {{limit}} children',
    allowUnknown: '!!"{{!child}}" 不能存在',
    with: 'missing required peer "{{peer}}"',
    without: 'conflict with forbidden peer "{{peer}}"',
    missing: 'must contain at least one of {{peers}}',
    xor: 'contains a conflict between exclusive peers {{peers}}',
    or: 'must contain at least one of {{peers}}',
    and: '包含 {{present}} 时 {{missing}} 必须也存在',
    nand: '!!"{{main}}" must not exist simultaneously with {{peers}}',
    assert: '!!"{{ref}}" validation failed because "{{ref}}" failed to {{message}}',
    rename: {
      multiple: 'cannot rename child "{{from}}" because multiple renames are disabled and another key was already renamed to "{{to}}"',
      override: 'cannot rename child "{{from}}" because override is disabled and target "{{to}}" exists'
    },
    type: 'must be an instance of "{{type}}"',
    schema: 'must be a Joi instance'
  },
  number: {
    base: '必须为数字',
    min: '最小为 {{limit}}',
    max: '最大为 {{limit}}',
    less: '需小于 {{limit}}',
    greater: '需大于 {{limit}}',
    float: '必须为浮点数',
    integer: '必须为整数',
    negative: '必须为负数',
    positive: '必须为正数',
    precision: '精度不能超过 {{limit}} 位',
    ref: 'references "{{ref}}" which is not a number',
    multiple: 'must be a multiple of {{multiple}}'
  },
  string: {
    base: '必须为字符串',
    min: '长度最少为 {{limit}}',
    max: '长度最大为 {{limit}}',
    length: '长度需等于 {{limit}}',
    alphanum: '只能包含字母和数字',
    token: '只能包含字母，数字和下划线',
    regex: {
      base: 'with value "{{!value}}" fails to match the required pattern: {{pattern}}',
      name: 'with value "{{!value}}" fails to match the {{name}} pattern',
      invert: {
        base: 'with value "{{!value}}" matches the inverted pattern: {{pattern}}',
        name: 'with value "{{!value}}" matches the inverted {{name}} pattern'
      }
    },
    email: '必须为合法邮箱地址',
    uri: '必须为合法uri',
    uriRelativeOnly: '必须为合法的相对uri',
    uriCustomScheme: 'must be a valid uri with a scheme matching the {{scheme}} pattern',
    isoDate: 'must be a valid ISO 8601 date',
    guid: 'must be a valid GUID',
    hex: 'must only contain hexadecimal characters',
    base64: 'must be a valid base64 string',
    hostname: 'must be a valid hostname',
    lowercase: 'must only contain lowercase characters',
    uppercase: 'must only contain uppercase characters',
    trim: '开头或结尾不能含有空格',
    creditCard: 'must be a credit card',
    ref: 'references "{{ref}}" which is not a number',
    ip: 'must be a valid ip address with a {{cidr}} CIDR',
    ipVersion: 'must be a valid ip address of one of the following versions {{version}} with a {{cidr}} CIDR'
  }
};
