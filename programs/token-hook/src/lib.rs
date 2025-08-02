use anchor_lang::prelude::*;

declare_id!("6EfhjRgXRRnvzLaxcDbyCd5zQaKNrDLrhHcsbQgwkJjt");

#[program]
pub mod token_hook {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
