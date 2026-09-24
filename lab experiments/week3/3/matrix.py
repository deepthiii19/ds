def lcs_length(X,Y):
    m,n=len(X),len(Y)
    dp=[[0]*(n+1) for _ in range(m+1)]
    for i in range(m):
        for j in range(n):
            if X[i]==Y[j]:
                dp[i+1][j+1]=dp[i][j]+1
            else:
                dp[i+1][j+1]=max(dp[i][j+1],dp[i+1][j])
    return dp[m][n]
seq1="ABCDEF"
seq2="AEBDF"
length=lcs_length(seq1,seq2)
print(f"Longest Common Subsequemce length between'{seq1}' and '{seq2}' : {length}")
