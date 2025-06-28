/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/route_cache_program.json`.
 */
export type RouteCacheProgram = {
  "address": "EkazNeYGJqJrMUrPyiULQjFHWuCQrohBWxX25tXjkpR",
  "metadata": {
    "name": "routeCacheProgram",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "updateRoute",
      "docs": [
        "这是一个可公开调用的指令，用于创建或更新一个交易对的路由缓存。",
        "ctx: 包含了所有必需账户的上下文。",
        "input_mint: 输入代币的地址，将作为 PDA 的种子之一。",
        "output_mint: 输出代币的地址，将作为 PDA 的种子之一。",
        "route: 一个包含多个步骤的向量，代表完整的交易路径。"
      ],
      "discriminator": [
        177,
        2,
        86,
        209,
        130,
        127,
        138,
        107
      ],
      "accounts": [
        {
          "name": "routeCache",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  117,
                  116,
                  101,
                  95,
                  118,
                  50
                ]
              },
              {
                "kind": "arg",
                "path": "route.input_mint"
              },
              {
                "kind": "arg",
                "path": "route.output_mint"
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "route",
          "type": {
            "defined": {
              "name": "routeInfo"
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "routeCache",
      "discriminator": [
        137,
        197,
        178,
        156,
        45,
        148,
        35,
        75
      ]
    }
  ],
  "types": [
    {
      "name": "routeCache",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "docs": [
              "管理员的地址，只有这个地址才能更新此缓存"
            ],
            "type": "pubkey"
          },
          {
            "name": "inputMint",
            "docs": [
              "输入代币的 Mint 地址，用于标识这个缓存是针对哪个交易对的"
            ],
            "type": "pubkey"
          },
          {
            "name": "outputMint",
            "docs": [
              "输出代币的 Mint 地址"
            ],
            "type": "pubkey"
          },
          {
            "name": "routePlan",
            "docs": [
              "存储交易路径的向量（动态数组）",
              "一条路径由多个“步骤”组成"
            ],
            "type": {
              "vec": {
                "defined": {
                  "name": "routeStepInfo"
                }
              }
            }
          },
          {
            "name": "lastUpdated",
            "docs": [
              "最后更新的时间戳，方便客户端判断缓存是否过时"
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "routeInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "inputMint",
            "docs": [
              "输入代币的 Mint 地址"
            ],
            "type": "pubkey"
          },
          {
            "name": "outputMint",
            "docs": [
              "输出代币的 Mint 地址"
            ],
            "type": "pubkey"
          },
          {
            "name": "routePlan",
            "docs": [
              "路由计划，一个包含多个步骤的向量"
            ],
            "type": {
              "vec": {
                "defined": {
                  "name": "routeStepInfo"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "routeStepInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "ammPoolId",
            "docs": [
              "该路由步骤所使用的流动性池（AMM）的地址"
            ],
            "type": "pubkey"
          },
          {
            "name": "inputMint",
            "docs": [
              "输入代币的 Mint 地址"
            ],
            "type": "pubkey"
          },
          {
            "name": "outputMint",
            "docs": [
              "输出代币的 Mint 地址"
            ],
            "type": "pubkey"
          },
          {
            "name": "inputVaultReserve",
            "type": "u64"
          },
          {
            "name": "outputVaultReserve",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
