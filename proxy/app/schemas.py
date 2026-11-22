"""Contract models: the single source of the browser<->Proxy contract (AD-4).

`web/api/schema.d.ts` is generated from the OpenAPI document built from these
models. Never hand-copy these shapes into TypeScript.
"""

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ContractModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class Status(ContractModel):
    key_configured: bool
    model: str
    provider: str
    prompt_version: str


class ErrorBody(ContractModel):
    code: str
