from pydantic import BaseModel # type: ignore

class ImageData(BaseModel):
    image: str
    dict_of_vars: dict