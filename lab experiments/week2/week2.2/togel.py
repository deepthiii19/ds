import pandas as pd
df=pd.DataFrame({
    'Name':['Anush','Deepthi','Naga','laKshmi']
})
df['Name_lower']=df['Name'].str.lower()
df['Name_Upper']=df['Name'].str.upper()
print(df)