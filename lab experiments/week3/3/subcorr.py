import pandas as pd
df=pd.DataFrame({
    'TOC':[10,20,30,40,50],
    'DS':[12,24,33,45,60],
    'ALT':[50,30,22,44,55]
})
corr_matrix=df.corr(method='pearson')
print("Pearson Correlation :\n",corr_matrix)

d=pd.read_csv("Iris.csv")
print(d.corr(method='pearson',numeric_only=True))