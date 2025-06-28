use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Clock;

// 最终版的程序，只负责存储核心的路由路径

// 请在部署后，将这里的 Program ID 更新为您自己的最终地址
declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"); 

#[program]
pub mod route_cache_program {
    use super::*;

    // 指令只接收最核心的路径信息
    pub fn update_route(
        ctx: Context<UpdateRoute>, 
        input_mint: Pubkey, 
        output_mint: Pubkey,
        route: Vec<RouteStep>
    ) -> Result<()> {
        let route_cache = &mut ctx.accounts.route_cache;

        route_cache.admin = *ctx.accounts.admin.key;
        route_cache.input_mint = input_mint;
        route_cache.output_mint = output_mint;
        route_cache.route = route; // 只存储路径
        
        let clock = Clock::get()?;
        route_cache.last_updated = clock.unix_timestamp;

        Ok(())
    }
}

// RouteStep 只包含路径所需的核心信息
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RouteStep {
    pub amm_pool_id: Pubkey,
    pub input_mint: Pubkey,
    pub output_mint: Pubkey,
}

// RouteCache 账户也恢复到精简版
#[account]
pub struct RouteCache {
    pub admin: Pubkey,
    pub input_mint: Pubkey,
    pub output_mint: Pubkey,
    pub route: Vec<RouteStep>,
    pub last_updated: i64,
}

#[derive(Accounts)]
#[instruction(input_mint: Pubkey, output_mint: Pubkey)]
pub struct UpdateRoute<'info> {
    // 空间计算也恢复到之前的版本
    #[account(
        init_if_needed,
        payer = admin,
        space = 8 + 32 + 32 + 32 + 8 + 4 + (90 * (32 + 32 + 32)),
        seeds = [b"route", input_mint.as_ref(), output_mint.as_ref()], // 使用原始种子
        bump
    )]
    pub route_cache: Account<'info, RouteCache>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}
